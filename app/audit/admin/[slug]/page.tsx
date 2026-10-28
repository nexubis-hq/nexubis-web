import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, isValidSession } from "@/lib/scorecard/auth";
import { LeadDetail } from "@/components/scorecard/admin/LeadDetail";
import { AuditFeedback } from "@/components/scorecard/admin/AuditFeedback";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
export default async function LeadPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string; reason?: string; updated?: string }>;
}) {
  const jar = await cookies();
  if (!isValidSession(jar.get(SESSION_COOKIE)?.value)) redirect("/audit/admin");
  const { slug } = await params;
  const q = await searchParams;
  return (
    <section className="section">
      <div className="site-container">
        <AuditFeedback
          error={q.error}
          reason={q.reason}
          successSlug={q.updated}
        />
        <LeadDetail id={slug} />
      </div>
    </section>
  );
}
