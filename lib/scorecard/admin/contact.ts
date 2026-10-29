import { getKv } from "../kv";
import { PROFILE_TTL } from "./profiles";

export interface AdminContact {
  firstName: string;
  lastName: string;
  role: string;
  edits: { at: string; text: string }[];
  editedFields?: ("firstName" | "lastName" | "role")[];
}
const key = (leadPath: string) => `scorecard-admin-contact:${leadPath}`;
export async function readAdminContact(
  leadPath: string
): Promise<AdminContact | null> {
  return getKv().get<AdminContact>(key(leadPath));
}
export async function writeAdminContact(
  leadPath: string,
  contact: AdminContact
): Promise<void> {
  await getKv().set(key(leadPath), contact, { ex: PROFILE_TTL });
}
export function contactField(value: FormDataEntryValue | null): string {
  const text = String(value ?? "").trim();
  if (text.length > 60)
    throw new Error("Contact fields must be 60 characters or fewer.");
  if (/[<>]/.test(text))
    throw new Error("Contact fields must be plain text without HTML.");
  return text;
}

export function parseLinkedinContact(
  label: string
): Pick<AdminContact, "firstName" | "lastName" | "role"> | null {
  try {
    const parts = label
      .replace(/\s*\|\s*LinkedIn\s*$/i, "")
      .trim()
      .split(/\s+(?:-|\u2013)\s+/);
    const words = parts[0].trim().split(/\s+/);
    if (words.length < 2 || !words.every((word) => /\p{L}/u.test(word)))
      return null;
    const firstName = contactField(words[0]);
    const lastName = contactField(words.slice(1).join(" "));
    const role = contactField(parts[1] || "");
    return { firstName, lastName, role };
  } catch {
    return null;
  }
}
// Called inside withProfileLock by the authenticated confirmation action.
export function linkedinContactOverride(
  parsed: NonNullable<ReturnType<typeof parseLinkedinContact>>,
  previous: AdminContact | null
): AdminContact | null {
  // Records saved before provenance existed came only from Edit contact.
  const editedFields =
    previous?.editedFields ??
    (previous ? (["firstName", "lastName", "role"] as const) : []);
  const next = {
    firstName: editedFields.includes("firstName")
      ? previous!.firstName
      : parsed.firstName,
    lastName: editedFields.includes("lastName")
      ? previous!.lastName
      : parsed.lastName,
    role: editedFields.includes("role") ? previous!.role : parsed.role,
  };
  if (
    previous &&
    next.firstName === previous.firstName &&
    next.lastName === previous.lastName &&
    next.role === previous.role
  )
    return null;
  return {
    ...next,
    editedFields: [...editedFields],
    edits: [
      {
        at: new Date().toISOString(),
        text: `Contact filled from LinkedIn: ${next.firstName} ${next.lastName}${next.role ? `, ${next.role}` : ""}`,
      },
      ...(previous?.edits || []),
    ],
  };
}
