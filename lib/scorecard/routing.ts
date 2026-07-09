// Internal routing flags, computed deterministically in code. These power the
// team's follow-up decisions and the weekly Loom selection: role seniority,
// vertical guess from the product one-liner, geo guess from the TLD, and the
// suggested follow-up timing per verdict. Nothing here is client-facing.
import type { VerdictBand } from "./scoring";

export type RoleSeniority = "ceo" | "director" | "manager" | "other" | "unknown";

export function roleSeniority(role: string): RoleSeniority {
  const r = role.trim().toLowerCase();
  if (!r) return "unknown";
  if (/ceo|md|managing director|owner|founder/.test(r)) return "ceo";
  if (/director/.test(r)) return "director";
  if (/manager|marketing|brand|comms/.test(r)) return "manager";
  return "other";
}

// Coarse vertical buckets from the product one-liner. A guess, clearly named
// as one; Funnelr and the admin view read it as a filter, never as truth.
const VERTICALS: Array<{ key: string; re: RegExp }> = [
  { key: "packaging", re: /packag|filling|sealing|labell?ing|bottling|capping/i },
  { key: "food-processing", re: /food|bakery|dairy|beverage|meat|dosing|depositing/i },
  { key: "machine-building", re: /machine|equipment|production line|cnc|milling|press(es)?\b/i },
  { key: "automation", re: /automat|robot|conveyor|handling|vision system/i },
  { key: "components", re: /component|valve|pump|bearing|sensor|fastener|cylinder/i },
  { key: "materials", re: /steel|plastic|coating|composite|extrusion|casting/i },
];

export function verticalGuess(productOneLiner: string): string {
  for (const v of VERTICALS) {
    if (v.re.test(productOneLiner)) return v.key;
  }
  return "other-industrial";
}

// Geo guess from the TLD. ccTLDs are strong signals; generic TLDs stay
// unknown rather than guessed.
const TLD_GEO: Record<string, string> = {
  nl: "Netherlands",
  de: "Germany",
  be: "Belgium",
  at: "Austria",
  ch: "Switzerland",
  fr: "France",
  it: "Italy",
  es: "Spain",
  se: "Sweden",
  dk: "Denmark",
  fi: "Finland",
  no: "Norway",
  pl: "Poland",
  cz: "Czechia",
  uk: "United Kingdom",
};

export function geoGuess(url: string): string {
  try {
    const host = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.toLowerCase();
    const parts = host.split(".");
    const tld = parts[parts.length - 1];
    if (tld === "uk" || host.endsWith(".co.uk")) return TLD_GEO.uk;
    return TLD_GEO[tld] ?? "unknown";
  } catch {
    return "unknown";
  }
}

export function followUpTiming(band: VerdictBand, seniority: RoleSeniority): string {
  if (band === "wide") {
    return seniority === "ceo" || seniority === "director"
      ? "Personal follow-up within 2 to 3 days, reference one specific finding"
      : "Personal follow-up within 3 to 4 days";
  }
  if (band === "visible") return "Let the sequence run; review at day 7";
  return "Do not push; let the nurture sequence work";
}

export interface RoutingFlags {
  roleSeniority: RoleSeniority;
  verticalGuess: string;
  geoGuess: string;
  followUpTiming: string;
  /** Weekly Loom selection signal: senior role or a real gap. */
  loomCandidate: boolean;
}

export function computeRouting(args: {
  role: string;
  productOneLiner: string;
  url: string;
  band: VerdictBand;
}): RoutingFlags {
  const seniority = roleSeniority(args.role);
  return {
    roleSeniority: seniority,
    verticalGuess: verticalGuess(args.productOneLiner),
    geoGuess: geoGuess(args.url),
    followUpTiming: followUpTiming(args.band, seniority),
    loomCandidate: args.band !== "narrow" || seniority === "ceo" || seniority === "director",
  };
}
