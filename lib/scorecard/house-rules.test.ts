import { test } from "vitest";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// CI guards for the house rules. Two rules, both hard brand violations:
//   1. The em dash (U+2014) never appears in Scorecard source: not in code,
//      comments, UI copy or template strings. Lines explicitly marked
//      `em-dash-ok` are exempt (the strip regex must contain the character it
//      removes).
//   2. The audit word never appears in a string literal in Scorecard source.
//      Client-facing copy says Scorecard or Credibility Check; internal
//      identifiers use scorecard naming. Lines marked `audit-ok` are exempt
//      (e.g. the banned-word regex itself and its tests).
// Scope: lib/scorecard and components/scorecard (the latter arrives with the
// UI prompts; scanned when present).
const HERE = dirname(fileURLToPath(import.meta.url)); // lib/scorecard
const SCAN_ROOTS = [HERE, resolve(HERE, "../../components/scorecard")].filter((p) => existsSync(p));
const EM_DASH = String.fromCharCode(0x2014);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(p);
  }
  return out;
}

const files = SCAN_ROOTS.flatMap((root) => walk(root));

test("no em dashes anywhere in Scorecard source", () => {
  const offenders: string[] = [];
  for (const file of files) {
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      if (line.includes(EM_DASH) && !line.includes("em-dash-ok")) {
        offenders.push(`${file}:${i + 1}: ${line.trim()}`);
      }
    });
  }
  assert.deepEqual(offenders, [], `Em dashes found in source:\n${offenders.join("\n")}`);
});

// Strings only: the rule is about copy that could reach a prospect, so comments
// are exempt but every quoted string is scanned. Matches audit/audits/audited/
// auditing case-insensitively inside '...', "..." or `...`.
const STRING_LITERAL = /(['"`])(?:\\.|(?!\1)[^\\\n])*\1/g;
const AUDIT_WORD = /\baudit(s|ed|ing)?\b/i;

test("the banned client-facing word never appears in a Scorecard string literal", () => { // audit-ok
  const offenders: string[] = [];
  for (const file of files) {
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      if (line.includes("audit-ok")) return;
      for (const m of line.matchAll(STRING_LITERAL)) {
        if (AUDIT_WORD.test(m[0])) {
          offenders.push(`${file}:${i + 1}: ${line.trim()}`);
          break;
        }
      }
    });
  }
  assert.deepEqual(offenders, [], `The word "audit" found in string literals:\n${offenders.join("\n")}`); // audit-ok
});
