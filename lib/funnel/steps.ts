export const FUNNEL_STEPS = ["arrived", "touched", "submitted"] as const;
export const CLIENT_FUNNEL_STEPS = ["arrived", "touched"] as const;

export type FunnelStep = (typeof FUNNEL_STEPS)[number];
export type ClientFunnelStep = (typeof CLIENT_FUNNEL_STEPS)[number];
export type FunnelSource = "ad" | "other";

export const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
export type UTMKey = (typeof UTM_KEYS)[number];
export type AdSource = Partial<Record<UTMKey, string>>;

export function isClientFunnelStep(value: unknown): value is ClientFunnelStep {
  return typeof value === "string" && (CLIENT_FUNNEL_STEPS as readonly string[]).includes(value);
}

export function isFunnelSource(value: unknown): value is FunnelSource {
  return value === "ad" || value === "other";
}

export function cleanAdSource(input: unknown): AdSource | null {
  if (!input || typeof input !== "object") return null;
  const record = input as Record<string, unknown>;
  const cleaned: AdSource = {};
  for (const key of UTM_KEYS) {
    const value = record[key];
    if (typeof value !== "string") continue;
    const text = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
    if (text) cleaned[key] = text;
  }
  return Object.keys(cleaned).length ? cleaned : null;
}

export function adSourceFromSearch(search: string): AdSource | null {
  const params = new URLSearchParams(search);
  return cleanAdSource(Object.fromEntries(UTM_KEYS.map((key) => [key, params.get(key)])));
}

export function funnelSourceFromSearch(search: string): FunnelSource {
  const params = new URLSearchParams(search);
  return params.get("utm_medium") === "paid_social" ||
    (Boolean(params.get("utm_source")) && Boolean(params.get("utm_content"))) ||
    params.has("fbclid")
    ? "ad"
    : "other";
}

export function adLabel(ad: AdSource | null | undefined): string | null {
  if (!ad) return null;
  const label = [ad.utm_content, ad.utm_source].filter(Boolean).join(" | ");
  return label || null;
}
