import { NextRequest, NextResponse } from "next/server";
import { submitContactLeadToFunnelr } from "@/lib/contact/funnelr";
import { notifyContactSubmission } from "@/lib/contact/notify";

const ALLOWED_PACKAGES = ["Momentum", "Scale", "Partner", "I'm not sure"] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_ELAPSED_MS = 2000;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 5;

const rateLimitStore = globalThis as typeof globalThis & {
  __contactRateLimit?: Map<string, { count: number; resetAt: number }>;
};
rateLimitStore.__contactRateLimit ??= new Map();

type AllowedPackage = (typeof ALLOWED_PACKAGES)[number];

interface ContactInput {
  name: string;
  email: string;
  companyName: string;
  websiteLink: string;
  package: AllowedPackage;
  additionalNotes: string;
  honeypot: string;
  elapsedMs: number | null;
}

function json(status: number, body: { ok: boolean; error?: string; notificationSent?: boolean }) {
  return NextResponse.json(body, { status });
}

function cleanString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length > max) return null;
  return trimmed;
}

function parse(body: unknown): ContactInput | { error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Malformed request." };
  }

  const allowed = new Set(["name", "email", "companyName", "websiteLink", "package", "additionalNotes", "honeypot", "elapsedMs"]);
  const extra = Object.keys(body).filter((key) => !allowed.has(key));
  if (extra.length) return { error: "Unexpected form field." };

  const record = body as Record<string, unknown>;
  const name = cleanString(record.name, 120);
  const email = cleanString(record.email, 254)?.toLowerCase() ?? null;
  const companyName = cleanString(record.companyName, 160);
  const websiteLink = cleanString(record.websiteLink ?? "", 300);
  const packageValue = cleanString(record.package, 40);
  const additionalNotes = cleanString(record.additionalNotes ?? "", 5000);
  const honeypot = cleanString(record.honeypot ?? "", 200);
  const elapsedMs = typeof record.elapsedMs === "number" && Number.isFinite(record.elapsedMs) ? record.elapsedMs : null;

  if (name === null || !name) return { error: "Add your name." };
  if (email === null || !EMAIL_RE.test(email)) return { error: "Enter a valid email address." };
  if (companyName === null || !companyName) return { error: "Add your company name." };
  if (websiteLink === null) return { error: "Website link is too long." };
  if (websiteLink) {
    try {
      const url = new URL(websiteLink.includes("://") ? websiteLink : `https://${websiteLink}`);
      if (!["http:", "https:"].includes(url.protocol)) return { error: "Enter a valid website URL." };
    } catch {
      return { error: "Enter a valid website URL." };
    }
  }
  if (!packageValue || !ALLOWED_PACKAGES.includes(packageValue as AllowedPackage)) {
    return { error: "Choose a valid package." };
  }
  if (additionalNotes === null) return { error: "Additional notes are too long." };
  if (honeypot === null || honeypot) {
    return { error: "Something went wrong with the form. Reload and try again." };
  }
  if (elapsedMs !== null && elapsedMs >= 0 && elapsedMs < MIN_ELAPSED_MS) {
    return { error: "Something went wrong with the form. Reload and try again." };
  }

  return {
    name,
    email,
    companyName,
    websiteLink,
    package: packageValue as AllowedPackage,
    additionalNotes: additionalNotes ?? "",
    honeypot,
    elapsedMs,
  };
}

function rateLimitKey(req: NextRequest, email: string): string {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  return `${ip}:${email.toLowerCase()}`;
}

function isRateLimited(key: string, now = Date.now()): boolean {
  const store = rateLimitStore.__contactRateLimit!;
  const current = store.get(key);
  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > RATE_LIMIT_MAX;
}

export async function POST(req: NextRequest) {
  if (!process.env.FUNNELR_API_KEY) {
    return json(503, { ok: false, error: "Contact form is not configured yet." });
  }

  const parsed = parse(await req.json().catch(() => null));
  if ("error" in parsed) return json(400, { ok: false, error: parsed.error });

  if (isRateLimited(rateLimitKey(req, parsed.email))) {
    return json(429, { ok: false, error: "Too many attempts. Try again later." });
  }

  const funnelr = await submitContactLeadToFunnelr({
    name: parsed.name,
    email: parsed.email,
  });
  if (!funnelr.ok || typeof funnelr.contactId !== "number") {
    return json(502, { ok: false, error: "Message delivery is temporarily unavailable. Try again later." });
  }

  const notificationSent = await notifyContactSubmission({
    name: parsed.name,
    email: parsed.email,
    companyName: parsed.companyName,
    websiteLink: parsed.websiteLink,
    package: parsed.package,
    additionalNotes: parsed.additionalNotes,
    funnelrContactId: funnelr.contactId,
    contactCreated: funnelr.contactCreated ?? false,
  });
  if (!notificationSent) {
    console.error(`[contact-form] internal notification failed after Funnelr capture for contact ${funnelr.contactId}.`);
  }

  return json(200, { ok: true, notificationSent });
}
