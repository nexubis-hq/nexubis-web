import { rerunAudit } from "@/app/audit/admin/actions";
import { AuditSubmitButton } from "./AuditSubmitButton";

export function RerunAuditForm({
  slug,
  destination = "report",
}: {
  slug: string;
  destination?: "manual" | "report";
}) {
  return (
    <form action={rerunAudit.bind(null, slug, destination)}>
      <AuditSubmitButton secondary>Re-run audit</AuditSubmitButton>
    </form>
  );
}
