import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, isValidSession } from "@/lib/scorecard/auth";
import { listLeads, type LeadRecord } from "@/lib/scorecard/leads";
import { categoryLabel, type CategoryKey } from "@/lib/scorecard/rubric";
import { setLoomStatus } from "../actions";

export const dynamic = "force-dynamic";

// The weekly Loom selection surface. Filters by verdict band and role; the
// Loom-candidate view sorts high-fit leads (senior role, wide or visible gap)
// to the top so whoever picks the weekly winners starts at the right end.
// Funnelr stays the CRM source of truth; this is the working view.

const VERDICTS = ["wide", "visible", "narrow"] as const;
const ROLES = ["Marketing manager", "Marketing director", "Brand or comms manager", "CEO or MD", "Other"] as const;

function fitScore(lead: LeadRecord): number {
  let score = 0;
  if (lead.routing.roleSeniority === "ceo") score += 4;
  if (lead.routing.roleSeniority === "director") score += 3;
  if (lead.verdict === "wide") score += 3;
  if (lead.verdict === "visible") score += 2;
  if (lead.routing.verticalGuess !== "other-industrial") score += 1;
  return score;
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ verdict?: string; role?: string; view?: string }>;
}) {
  const jar = await cookies();
  if (!isValidSession(jar.get(SESSION_COOKIE)?.value)) redirect("/audit/admin");
  const { verdict, role, view } = await searchParams;
  const loomView = view === "loom";

  let leads = await listLeads();
  if (verdict && (VERDICTS as readonly string[]).includes(verdict)) leads = leads.filter((l) => l.verdict === verdict);
  if (role) leads = leads.filter((l) => l.role === role);
  if (loomView) {
    leads = leads.filter((l) => l.routing.loomCandidate).sort((a, b) => fitScore(b) - fitScore(a));
  }

  const filterHref = (params: Record<string, string | undefined>) => {
    const merged = { verdict, role, view, ...params };
    const q = Object.entries(merged)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
      .join("&");
    return `/audit/admin/leads${q ? `?${q}` : ""}`;
  };

  return (
    <section className="section">
      <div className="site-container">
        <header className="sc-admin-head">
          <h1>Leads</h1>
          <div className="sc-admin-filters">
            <span>Verdict:</span>
            <Link href={filterHref({ verdict: undefined })} className={!verdict ? "is-active" : undefined}>
              all
            </Link>
            {VERDICTS.map((v) => (
              <Link key={v} href={filterHref({ verdict: v })} className={verdict === v ? "is-active" : undefined}>
                {v}
              </Link>
            ))}
            <span>Role:</span>
            <Link href={filterHref({ role: undefined })} className={!role ? "is-active" : undefined}>
              all
            </Link>
            {ROLES.map((r) => (
              <Link key={r} href={filterHref({ role: r })} className={role === r ? "is-active" : undefined}>
                {r}
              </Link>
            ))}
            <span>View:</span>
            <Link href={filterHref({ view: undefined })} className={!loomView ? "is-active" : undefined}>
              newest
            </Link>
            <Link href={filterHref({ view: "loom" })} className={loomView ? "is-active" : undefined}>
              Loom candidates
            </Link>
          </div>
        </header>

        {leads.length === 0 ? (
          <p className="sc-admin-empty">No leads {verdict || role || loomView ? "match these filters" : "yet"}.</p>
        ) : (
          <div className="sc-admin-tablewrap">
            <table className="sc-admin-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Contact</th>
                  <th>Role</th>
                  <th>Score</th>
                  <th>Verdict</th>
                  <th>First fix</th>
                  <th>Competitors</th>
                  <th>Webhook</th>
                  <th>Loom</th>
                  <th>Created</th>
                  <th>Links</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.reportSlug} className={loomView && fitScore(l) >= 5 ? "sc-row-hot" : undefined}>
                    <td>
                      <Link href={`/audit/admin/${l.reportSlug}`}>{l.company}</Link>
                      {l.note ? <span className="sc-admin-notedot" title={l.note} /> : null}
                    </td>
                    <td>
                      {l.name}
                      <br />
                      <a href={`mailto:${l.email}`} className="sc-admin-dim">
                        {l.email}
                      </a>
                    </td>
                    <td>{l.role}</td>
                    <td className="sc-admin-score">{l.credibilityScore}</td>
                    <td>
                      <span className={`sc-admin-band sc-admin-band-${l.verdict}`}>{l.verdict}</span>
                    </td>
                    <td>{l.firstFixCategory ? categoryLabel(l.firstFixCategory as CategoryKey) : "n/a"}</td>
                    <td className="sc-admin-dim">{l.competitors.map((c) => c.name).join(", ")}</td>
                    <td>
                      <span className={l.webhookStatus === "failed" ? "sc-admin-warn" : "sc-admin-dim"}>{l.webhookStatus}</span>
                    </td>
                    <td>
                      <form action={setLoomStatus} className="sc-admin-inlineform">
                        <input type="hidden" name="slug" value={l.reportSlug} />
                        <select name="loomStatus" defaultValue={l.loomStatus}>
                          <option value="none">none</option>
                          <option value="selected">selected</option>
                          <option value="recorded">recorded</option>
                          <option value="sent">sent</option>
                        </select>
                        <button type="submit">Save</button>
                      </form>
                    </td>
                    <td className="sc-admin-dim">{l.createdAt.slice(0, 10)}</td>
                    <td>
                      <Link href={`/audit/r/${l.reportSlug}`}>report</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
