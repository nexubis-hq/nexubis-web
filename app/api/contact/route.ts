import { NextRequest, NextResponse } from "next/server";

const ALLOWED_PACKAGES = ["Momentum", "Scale", "Flex", "I'm not sure"] as const;
const SUBJECT = "New onboarding message from a client on contact-form";
const FROM = process.env.CONTACT_EMAIL_FROM || "Nexubis Onboarding <hello@nexubis.io>";
const RECIPIENTS = ["hello@nexubis.io", "laine@nexubis.io"];
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
  spamToken: string;
  honeypot: string;
  elapsedMs: number | null;
}

function json(status: number, body: { ok: boolean; error?: string }) {
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

  const allowed = new Set([
    "name",
    "email",
    "companyName",
    "websiteLink",
    "package",
    "additionalNotes",
    "spamToken",
    "honeypot",
    "elapsedMs",
  ]);
  const extra = Object.keys(body).filter((key) => !allowed.has(key));
  if (extra.length) return { error: "Unexpected form field." };

  const record = body as Record<string, unknown>;
  const name = cleanString(record.name, 120);
  const email = cleanString(record.email, 254);
  const companyName = cleanString(record.companyName, 160);
  const websiteLink = cleanString(record.websiteLink ?? "", 300);
  const packageValue = cleanString(record.package, 40);
  const additionalNotes = cleanString(record.additionalNotes ?? "", 5000);
  const spamToken = cleanString(record.spamToken, 2048);
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
  if (!spamToken) return { error: "Complete the verification check." };

  return {
    name,
    email,
    companyName,
    websiteLink,
    package: packageValue as AllowedPackage,
    additionalNotes: additionalNotes ?? "",
    spamToken,
    honeypot,
    elapsedMs,
  };
}

async function verifyTurnstile(token: string, ip: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, ...(ip ? { remoteip: ip } : {}) }),
    });
    const body = (await res.json()) as { success?: boolean };
    return body.success === true;
  } catch (err) {
    console.error("[contact-form] Turnstile verification failed:", err instanceof Error ? err.message : err);
    return false;
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatSubmission(input: ContactInput, submittedAt: string) {
  const website = input.websiteLink || "Not supplied";
  const notes = input.additionalNotes || "Not supplied";
  const text = [
    "New onboarding message from contact-form.",
    "",
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    `Company Name: ${input.companyName}`,
    `Website Link: ${website}`,
    `Package: ${input.package}`,
    `Additional Notes: ${notes}`,
    "",
    `Submission date and time: ${submittedAt}`,
    "Page source: /contact",
  ].join("\n");

  const rows = [
    ["Name", input.name],
    ["Email", input.email],
    ["Company Name", input.companyName],
    ["Website Link", website],
    ["Package", input.package],
    ["Additional Notes", notes],
    ["Submission date and time", submittedAt],
    ["Page source", "/contact"],
  ];
  const html = `
    <div style="font-family:Arial,sans-serif;color:#1d1c1a;line-height:1.5">
      <h2 style="margin:0 0 16px">New onboarding message from contact-form</h2>
      <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:680px">
        ${rows
          .map(
            ([label, value]) => `
              <tr>
                <th align="left" style="border-bottom:1px solid #eeeeec;padding:10px 12px 10px 0;vertical-align:top;width:190px">${escapeHtml(label)}</th>
                <td style="border-bottom:1px solid #eeeeec;padding:10px 0;vertical-align:top;white-space:pre-wrap">${escapeHtml(value)}</td>
              </tr>
            `,
          )
          .join("")}
      </table>
    </div>
  `;

  return { text, html };
}

async function sendNotification(input: ContactInput): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const submittedAt = new Date().toISOString();
  const { text, html } = formatSubmission(input, submittedAt);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: RECIPIENTS,
        subject: SUBJECT,
        text,
        html,
        reply_to: input.email,
      }),
    });
    if (!res.ok) {
      console.error(`[contact-form] Resend returned ${res.status}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[contact-form] email send failed:", err instanceof Error ? err.message : err);
    return false;
  }
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
  if (!process.env.RESEND_API_KEY || !process.env.TURNSTILE_SECRET_KEY) {
    return json(503, { ok: false, error: "Contact form is not configured yet." });
  }

  const parsed = parse(await req.json().catch(() => null));
  if ("error" in parsed) return json(400, { ok: false, error: parsed.error });

  if (isRateLimited(rateLimitKey(req, parsed.email))) {
    return json(429, { ok: false, error: "Too many attempts. Try again later." });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? null;
  const human = await verifyTurnstile(parsed.spamToken, ip);
  if (!human) return json(400, { ok: false, error: "The verification check did not pass. Try again." });

  const sent = await sendNotification(parsed);
  if (!sent) {
    return json(502, { ok: false, error: "Message delivery is temporarily unavailable. Try again later." });
  }

  return json(200, { ok: true });
}
