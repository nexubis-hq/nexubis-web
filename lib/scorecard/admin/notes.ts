import { getKv } from "../kv";
import { readShared } from "../share";
export interface AdminNote {
  note: string;
  updatedAt: string;
}
export async function readAdminNote(slug: string): Promise<AdminNote | null> {
  return getKv().get<AdminNote>(`scorecard-admin-note:${slug}`);
}
export async function saveAdminNote(slug: string, note: string): Promise<void> {
  const shared = await readShared(slug);
  if (!shared) return;
  const ttl = Math.ceil((Date.parse(shared.expiresAt) - Date.now()) / 1000);
  if (ttl <= 0) return;
  await getKv().set(
    `scorecard-admin-note:${slug}`,
    { note, updatedAt: new Date().toISOString() },
    { ex: ttl }
  );
}
