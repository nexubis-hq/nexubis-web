import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, isValidSession } from "@/lib/scorecard/auth";
import { LeadDetail } from "@/components/scorecard/admin/LeadDetail";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
export default async function FailedLeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const jar = await cookies();
  if (!isValidSession(jar.get(SESSION_COOKIE)?.value)) redirect("/audit/admin");
  const { id } = await params;
  return (
    <section className="section">
      <div className="site-container">
        <LeadDetail id={id} failed />
      </div>
    </section>
  );
}
