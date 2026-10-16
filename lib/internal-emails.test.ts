import { expect, it } from "vitest";
import { internalEmailSet, isInternalEmail } from "./internal-emails";

it.each([
  ["shannah+qa1@nexubis.io", true],
  ["hello@nexubis.io", true],
  ["  SHANNAH+QA2@NEXUBIS.IO  ", true],
  ["someone@client.com", false],
  ["someone@evilnexubis.io", false],
  ["", false],
  ["   ", false],
  [null, false],
  [undefined, false],
])("identifies internal address %s as %s", (email, expected) => {
  expect(isInternalEmail(email)).toBe(expected);
});

it("continues to recognise every address in the existing internal list", () => {
  for (const address of internalEmailSet()) {
    expect(isInternalEmail(` ${address.toUpperCase()} `)).toBe(true);
  }
});
