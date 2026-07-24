import { test } from "vitest";
import assert from "node:assert/strict";
import { applyRepliedTag, extractEmail } from "./reply-tagger";
import { NEXUBIS_TAGS } from "./nexubis-tags";

const REPLIED = NEXUBIS_TAGS.pipelineReplied;

interface Contact {
  userId: number;
  tags: string[];
}

function mockClient(contacts: Record<string, Contact | null>) {
  const applied: Array<{ userId: number; tagId: string }> = [];
  const client = {
    async findContactByEmail(email: string) {
      const c = contacts[email.toLowerCase()];
      return c ? { userId: c.userId } : null;
    },
    async getContactTags(userId: number) {
      const c = Object.values(contacts).find((x) => x && x.userId === userId);
      return (c?.tags ?? []).map((name) => ({ tagId: "id-" + name, name }));
    },
    async findTagByName(name: string) {
      return { tagId: "id-" + name };
    },
    async addTagToContact(userId: number, tagId: string) {
      applied.push({ userId, tagId });
    },
  };
  return { client, applied };
}

test("extractEmail handles Name <email>, bare email, and junk", () => {
  assert.equal(extractEmail("Jane Buyer <jane@acme.co.za>"), "jane@acme.co.za");
  assert.equal(extractEmail("MARK@Veltkamp-Dosing.NL"), "mark@veltkamp-dosing.nl");
  assert.equal(extractEmail("<a@b.io>"), "a@b.io");
  assert.equal(extractEmail("no address here"), null);
  assert.equal(extractEmail(undefined), null);
});

test("a reply from an internal/team address is never self-tagged", async () => {
  const { client, applied } = mockClient({ "hello@nexubis.io": { userId: 1, tags: [] } });
  const res = await applyRepliedTag("hello@nexubis.io", { client });
  assert.equal(res.reason, "internal");
  assert.equal(res.applied, false);
  assert.equal(applied.length, 0);
});

test("a reply from a non-contact is a no-op", async () => {
  const { client } = mockClient({ "stranger@x.com": null });
  const res = await applyRepliedTag("stranger@x.com", { client });
  assert.equal(res.ok, true);
  assert.equal(res.reason, "not-a-contact");
  assert.equal(res.applied, false);
});

test("a matching contact gets the Replied tag", async () => {
  const { client, applied } = mockClient({ "jane@acme.co.za": { userId: 7, tags: [] } });
  const res = await applyRepliedTag("jane@acme.co.za", { client });
  assert.equal(res.applied, true);
  assert.equal(res.reason, "applied");
  assert.deepEqual(applied, [{ userId: 7, tagId: "id-" + REPLIED }]);
});

test("already-replied contacts are not re-tagged (idempotent)", async () => {
  const { client, applied } = mockClient({ "jane@acme.co.za": { userId: 7, tags: [REPLIED] } });
  const res = await applyRepliedTag("jane@acme.co.za", { client });
  assert.equal(res.reason, "already-replied");
  assert.equal(res.applied, false);
  assert.equal(applied.length, 0);
});

test("dry run reports a match but applies no tag", async () => {
  const { client, applied } = mockClient({ "jane@acme.co.za": { userId: 7, tags: [] } });
  const res = await applyRepliedTag("jane@acme.co.za", { client, dryRun: true });
  assert.equal(res.reason, "dry-run");
  assert.equal(res.applied, false);
  assert.equal(applied.length, 0);
});
