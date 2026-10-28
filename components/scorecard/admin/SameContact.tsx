import Link from "next/link";
import type { LeadRow } from "@/lib/scorecard/admin/leads-view";
export function SameContact({
  contacts,
}: {
  contacts: LeadRow["sameContacts"];
}) {
  if (!contacts.length) return null;
  return (
    <span className="sc-admin-subtext sc-admin-samecontact">
      Same contact as{" "}
      {contacts.map((contact, i) => (
        <span key={contact.leadPath}>
          {i > 0 ? ", " : ""}
          <Link href={contact.leadPath}>{contact.company}</Link>
        </span>
      ))}
    </span>
  );
}
