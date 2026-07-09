import { test, beforeEach, afterEach } from "vitest";
import assert from "node:assert/strict";
import { detectProspectContextUncached, applyDetection, fingerprintFromDetect, filterRescuedCompetitors } from "./detect";
import { prospectFromRunInput } from "./run";

// Website-only detection in mock mode: a bare URL yields a one-liner and up to
// three competitor entries, with zero spend. Mock reads are deterministic.
beforeEach(() => {
  process.env.SCORECARD_MOCK = "1";
});
afterEach(() => {
  delete process.env.SCORECARD_MOCK;
});

test("detection reads a one-liner and competitors from a bare URL", async () => {
  const prospect = prospectFromRunInput({ url: "veltkamp-dosing.nl" });
  assert.equal(prospect.productOneLiner, "");
  assert.equal(prospect.competitors.length, 0);

  const detection = await detectProspectContextUncached(prospect);
  assert.ok(detection.productOneLiner.length > 0, "a one-liner is detected");
  assert.ok(detection.competitors.length >= 2, "at least two competitors are detected");
  assert.ok(detection.competitors.length <= 3, "competitors cap at three");
});

test("applyDetection folds detected fields onto the prospect as raw entries", async () => {
  const prospect = prospectFromRunInput({ url: "veltkamp-dosing.nl" });
  const detection = await detectProspectContextUncached(prospect);
  const enriched = applyDetection(prospect, detection);

  assert.equal(enriched.url, prospect.url); // url is untouched
  assert.equal(enriched.productOneLiner, detection.productOneLiner);
  assert.deepEqual(
    enriched.competitors.map((c) => c.raw),
    detection.competitors,
  );
  // Detected competitors start unresolved; the evidence resolver upgrades them.
  assert.ok(enriched.competitors.every((c) => c.resolved === undefined));
});

test("detection carries an industry fingerprint and applyDetection folds it onto the prospect", async () => {
  const prospect = prospectFromRunInput({ url: "veltkamp-dosing.nl" });
  const detection = await detectProspectContextUncached(prospect);
  assert.ok(detection.fingerprint, "a fingerprint is detected");
  assert.ok(Array.isArray(detection.fingerprint.industries));
  assert.ok(typeof detection.fingerprint.buyerPersona === "string");

  const enriched = applyDetection(prospect, detection);
  assert.deepEqual(enriched.fingerprint, detection.fingerprint);
});

test("the detected company name replaces the URL-derived placeholder; an empty name leaves it alone", async () => {
  const prospect = prospectFromRunInput({ url: "veltkamp-dosing.nl" });
  const detection = await detectProspectContextUncached(prospect);
  assert.ok(detection.companyName.length > 0, "mock detection carries a company name");
  const enriched = applyDetection(prospect, detection);
  assert.equal(enriched.company, detection.companyName);

  const unnamed = applyDetection(prospect, { ...detection, companyName: "" });
  assert.equal(unnamed.company, prospect.company); // placeholder survives
});

test("fingerprintFromDetect normalises missing fields from pre-fingerprint payloads to safe empties", () => {
  const fp = fingerprintFromDetect({ productOneLiner: "pumps", competitors: [] });
  assert.deepEqual(fp.industries, []);
  assert.deepEqual(fp.certifications, []);
  assert.deepEqual(fp.productFamilies, []);
  assert.equal(fp.salesModel, "unclear");
  assert.equal(fp.buyerPersona, "");
});

test("detection carries an industry fit; mock sites read as manufacturers", async () => {
  const prospect = prospectFromRunInput({ url: "veltkamp-dosing.nl" });
  const detection = await detectProspectContextUncached(prospect);
  assert.equal(detection.industryFit, "manufacturer");
});

test("rescued competitors never include the prospect itself, dupes or junk", () => {
  const out = filterRescuedCompetitors(
    ["Coperion", "coperion", "DMN-Westinghouse", "dmnwestinghouse.com", "Gericke AG", "", "x"],
    "DMN-Westinghouse",
    "https://www.dmnwestinghouse.com",
  );
  assert.deepEqual(out, ["Coperion", "Gericke AG"]);
});
