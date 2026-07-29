import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const euroPath = path.join(root, "public/assets/lotties/CompetitorComparison_Euro.json");
const mobilePath = path.join(root, "public/assets/lotties/CompetitorComparison_Mobile.json");
const outputPath = path.join(root, "public/assets/lotties/CompetitorComparison_Euro_Mobile.json");

const euro = JSON.parse(fs.readFileSync(euroPath, "utf8"));
const mobile = JSON.parse(fs.readFileSync(mobilePath, "utf8"));

const clone = (value) => JSON.parse(JSON.stringify(value));

function textValues(layer) {
  return (layer.t?.d?.k ?? []).map((entry) => entry.s?.t).filter(Boolean);
}

function setText(layer, value) {
  for (const entry of layer.t?.d?.k ?? []) {
    if (entry.s?.t) entry.s.t = value;
  }
  layer.nm = value;
}

function copyKeyTiming(targetProperty, sourceProperty) {
  if (!targetProperty || !sourceProperty) return;
  if (targetProperty.a !== 1 || sourceProperty.a !== 1) return;
  if (!Array.isArray(targetProperty.k) || !Array.isArray(sourceProperty.k)) return;
  if (targetProperty.k.length !== sourceProperty.k.length) return;

  targetProperty.k = targetProperty.k.map((targetKey, index) => {
    const sourceKey = sourceProperty.k[index];
    return {
      ...clone(sourceKey),
      s: clone(targetKey.s),
      e: targetKey.e === undefined ? undefined : clone(targetKey.e),
    };
  });
}

function copySplitPositionTiming(targetLayer, sourceLayer) {
  const targetPosition = targetLayer.ks?.p;
  const sourcePosition = sourceLayer.ks?.p;
  if (!targetPosition?.s || !sourcePosition?.s) return;
  copyKeyTiming(targetPosition.y, sourcePosition.y);
}

function copyAnimatedScaleTiming(targetLayer, sourceLayer) {
  copyKeyTiming(targetLayer.ks?.s, sourceLayer.ks?.s);
}

function matchingLayer(sourceLayers, targetLayer) {
  return sourceLayers.find((layer) => layer.ind === targetLayer.ind) ?? null;
}

const output = clone(mobile);
output.v = euro.v;
output.fr = euro.fr;
output.ip = euro.ip;
output.op = euro.op;
output.nm = euro.nm;
output.assets = clone(euro.assets ?? []);
output.fonts = clone(euro.fonts);
if (Array.isArray(euro.chars)) {
  output.chars = clone(euro.chars.filter((char) => char.ch !== "$"));
}

const euroLayers = euro.layers ?? [];
const visibleEuroPriceText = textValues(euroLayers.find((layer) => layer.ind === 21) ?? {});
const finalInHousePrice = visibleEuroPriceText.at(9) ?? "€56 300/m";

for (const layer of output.layers ?? []) {
  const sourceLayer = matchingLayer(euroLayers, layer);
  if (!sourceLayer) continue;

  if (sourceLayer.ty === 4 && sourceLayer.shapes) {
    layer.shapes = clone(sourceLayer.shapes);
  }

  if (sourceLayer.ty === 5 && sourceLayer.t) {
    layer.t = clone(sourceLayer.t);
  }

  if (sourceLayer.ef) {
    layer.ef = clone(sourceLayer.ef);
  }

  if (sourceLayer.ks?.o) {
    layer.ks.o = clone(sourceLayer.ks.o);
  }

  copySplitPositionTiming(layer, sourceLayer);
  copyAnimatedScaleTiming(layer, sourceLayer);

  if (sourceLayer.nm.includes("€")) {
    layer.nm = sourceLayer.nm;
  }
}

const glyphReference = output.layers.find((layer) => layer.ind === 19);
if (glyphReference) setText(glyphReference, "€0123456789 /pm");

const hiddenDollarPrice = output.layers.find((layer) => layer.ind === 20);
if (hiddenDollarPrice) setText(hiddenDollarPrice, finalInHousePrice);

fs.writeFileSync(outputPath, `${JSON.stringify(output)}\n`);

console.log(`Generated ${path.relative(root, outputPath)}`);
