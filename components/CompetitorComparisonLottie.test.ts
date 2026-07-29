import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "vitest";

const root = process.cwd();
const componentPath = path.join(root, "components/CompetitorComparisonLottie.tsx");
const desktopPath = path.join(root, "public/assets/lotties/CompetitorComparison_Euro.json");
const oldMobilePath = path.join(root, "public/assets/lotties/CompetitorComparison_Mobile.json");
const mobilePath = path.join(root, "public/assets/lotties/CompetitorComparison_Euro_Mobile.json");

type LottieLayer = {
  ind: number;
  nm: string;
  ty: number;
  parent?: number;
  tt?: number;
  ip?: number;
  op?: number;
  ef?: Array<{ nm?: string; ef?: Array<{ nm?: string; v?: { k?: number } }> }>;
  shapes?: unknown;
  t?: { d?: { k?: Array<{ s?: { t?: string } }> } };
};

type LottieFile = {
  w: number;
  h: number;
  fr: number;
  ip: number;
  op: number;
  fonts?: { list?: Array<{ fName?: string; fFamily?: string; fStyle?: string }> };
  layers: LottieLayer[];
};

function readJson(filePath: string): LottieFile {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as LottieFile;
}

function textValues(animation: LottieFile): string[] {
  return animation.layers.flatMap((layer) =>
    (layer.t?.d?.k ?? []).map((entry) => entry.s?.t).filter((value): value is string => Boolean(value)),
  );
}

function layer(animation: LottieFile, index: number): LottieLayer {
  const found = animation.layers.find((item) => item.ind === index);
  assert.ok(found, `Expected layer ${index} to exist`);
  return found;
}

function setMatteRefs(layer: LottieLayer): number[] {
  return (layer.ef ?? [])
    .filter((effect) => effect.nm === "Set Matte")
    .flatMap((effect) => effect.ef ?? [])
    .filter((effect) => effect.nm === "Take Matte From Layer")
    .map((effect) => effect.v?.k)
    .filter((value): value is number => typeof value === "number");
}

test("competitor comparison maps desktop and mobile sources at the approved breakpoint", () => {
  const source = fs.readFileSync(componentPath, "utf8");

  assert.match(source, /const DESKTOP_PATH = "\/assets\/lotties\/CompetitorComparison_Euro\.json";/);
  assert.match(source, /const MOBILE_PATH = "\/assets\/lotties\/CompetitorComparison_Euro_Mobile\.json";/);
  assert.match(source, /window\.matchMedia\("\(max-width: 767px\)"\)/);
});

test("competitor comparison lottie json files are valid and have sane frame ranges", () => {
  for (const filePath of [desktopPath, oldMobilePath, mobilePath]) {
    const animation = readJson(filePath);
    assert.ok(animation.w > 0);
    assert.ok(animation.h > 0);
    assert.equal(animation.fr, 24);
    assert.equal(animation.ip, 0);
    assert.ok(animation.op > animation.ip);
    assert.ok(animation.layers.length > 0);
  }
});

test("euro mobile lottie preserves mobile composition geometry", () => {
  const oldMobile = readJson(oldMobilePath);
  const euroMobile = readJson(mobilePath);

  assert.equal(euroMobile.w, oldMobile.w);
  assert.equal(euroMobile.h, oldMobile.h);
  assert.equal(euroMobile.layers.length, oldMobile.layers.length);
  assert.equal(layer(euroMobile, 38).parent, undefined);
  assert.deepEqual(layer(euroMobile, 38).nm, "vs-circle");
});

test("euro mobile lottie contains euro prices and no old mobile dollar prices", () => {
  const euroMobile = readJson(mobilePath);
  const values = textValues(euroMobile);
  const source = fs.readFileSync(mobilePath, "utf8");

  for (const value of ["€0/m", "€4 200/m", "€6 300/m", "€25 200/m", "€56 300/m"]) {
    assert.ok(values.includes(value), `Expected ${value}`);
  }

  for (const oldValue of ["$0/m", "$3 200/m", "$5 600/m", "$14 100/m", "$63 400/m", "$60 000/m"]) {
    assert.equal(source.includes(oldValue), false, `Old mobile price remained: ${oldValue}`);
  }
});

test("euro mobile lottie preserves required text values and font reference", () => {
  const euroMobile = readJson(mobilePath);
  const values = textValues(euroMobile);

  assert.ok(values.includes("In-House Team"));
  assert.ok(values.includes("vs"));
  assert.ok(values.includes("€0123456789 /pm"));
  assert.ok(euroMobile.fonts?.list?.some((font) => font.fName === "HelveticaNowDisplay-Medium"));
});

test("euro mobile role pill artwork is copied from the euro source once per mapped layer", () => {
  const euro = readJson(desktopPath);
  const euroMobile = readJson(mobilePath);
  const pillLayers = [...Array.from({ length: 9 }, (_, index) => index + 1), ...Array.from({ length: 9 }, (_, index) => index + 10)];

  for (const index of pillLayers) {
    const desktopLayer = layer(euro, index);
    const mobileLayer = layer(euroMobile, index);

    assert.deepEqual(mobileLayer.shapes, desktopLayer.shapes, `Layer ${index} artwork should match Euro source`);
    assert.equal(euroMobile.layers.filter((item) => item.ind === index).length, 1);
  }
});

test("euro mobile lottie matte and parent references resolve", () => {
  const euroMobile = readJson(mobilePath);
  const layerIds = new Set(euroMobile.layers.map((item) => item.ind));

  for (const item of euroMobile.layers) {
    if (item.parent !== undefined) assert.ok(layerIds.has(item.parent), `${item.nm} parent ${item.parent} missing`);
    if (item.tt !== undefined) assert.ok(layerIds.has(item.ind + 1), `${item.nm} track matte layer missing`);
    for (const matte of setMatteRefs(item)) {
      assert.ok(layerIds.has(matte), `${item.nm} Set Matte reference ${matte} missing`);
    }
  }
});
