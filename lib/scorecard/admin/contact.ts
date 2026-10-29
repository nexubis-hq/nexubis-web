import { getKv } from "../kv";
import { PROFILE_TTL } from "./profiles";

export interface AdminContact {
  firstName: string;
  lastName: string;
  role: string;
  edits: { at: string; text: string }[];
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
