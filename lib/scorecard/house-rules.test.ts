import { test } from "vitest";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// CI guard for the house rules. One rule, a hard brand violation:
//   The em dash (U+2014) never appears in audit source: not in code,
//   comments, UI copy or template strings. Lines explicitly marked
//   `em-dash-ok` are exempt (the strip regex must contain the character it
//   removes).
// A second rule banning the word "audit" in string literals was retired on
// 2026-09-01 when the tool was renamed to The Online Credibility Audit.
// Scope: lib/scorecard and components/scorecard.
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

test("no em dashes anywhere in audit source", () => {
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
