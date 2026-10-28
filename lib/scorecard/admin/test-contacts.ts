export const TEST_CONTACT_RULES = ["@nexubis.io", "shannahdt9"] as const;
export function isTestContact(email?: string | null): boolean {
  const value = (email ?? "").trim().toLowerCase();
  const [local, domain] = value.split("@");
  return Boolean(
    domain &&
    TEST_CONTACT_RULES.some((rule) =>
      rule.startsWith("@") ? domain === rule.slice(1) : local.startsWith(rule)
    )
  );
}
