"use client";

// The landing visual: a decorative Credibility Scorecard preview built from the
// real rubric's five categories (the five places buyers look). It is NOT a live
// score, it shows a prospect what the tool measures: a filled red shape across
// Brand, Website, Visuals, Print and Message, with a dashed benchmark outline
// behind it.
//
// Motion: the "You" shape and its dots morph seamlessly between a few believable
// score profiles on an endless, eased loop (declarative SMIL, so the browser
// interpolates and loops with no JS ticking). Respects reduced-motion: when a
// visitor prefers less motion we render the first profile, static.
import { useEffect, useState } from "react";
import { RUBRIC } from "@/lib/scorecard/rubric";

// Short axis labels in rubric order, phrased for a first-time viewer.
const AXES: string[] = RUBRIC.map((cat) => {
  const short: Record<string, string> = {
    "brand-identity": "Brand",
    website: "Website",
    "product-visuals": "Visuals",
    "trade-show-print": "Print",
    "message-clarity": "Message",
  };
  return short[cat.key] ?? cat.label;
});

// Believable, undersold-but-decent profiles (0..1 per axis). The shape stays
// "some strong, some soft" through the whole loop, never flat or perfect.
const YOU_PROFILES = [
  [0.82, 0.58, 0.44, 0.66, 0.9],
  [0.7, 0.82, 0.6, 0.54, 0.74],
  [0.6, 0.66, 0.86, 0.76, 0.56],
  [0.9, 0.52, 0.56, 0.82, 0.66],
];
const BENCH_PROFILES = [
  [0.7, 0.74, 0.72, 0.6, 0.66],
  [0.66, 0.68, 0.7, 0.74, 0.62],
  [0.76, 0.62, 0.64, 0.66, 0.72],
  [0.68, 0.72, 0.7, 0.64, 0.6],
];

const W = 360;
const H = 320;
const CX = W / 2;
const CY = 158;
const R = 96;
const LABEL_R = R + 24;
const DUR = "11s";

function point(i: number, n: number, radius: number): [number, number] {
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
  return [CX + radius * Math.cos(angle), CY + radius * Math.sin(angle)];
}

function shape(values: number[]): string {
  return values.map((v, i) => point(i, values.length, R * Math.max(0, Math.min(1, v))).join(",")).join(" ");
}

// Seamless loop: repeat the first frame at the end so the morph returns home
// with no jump. Eased with a shared ease-in-out spline per segment.
function loop<T>(frames: T[]): T[] {
  return [...frames, frames[0]];
}
function joinPoints(profiles: number[][]): string {
  return loop(profiles).map(shape).join(";");
}
function axisValues(profiles: number[][], i: number, axis: 0 | 1): string {
  return loop(profiles)
    .map((p) => point(i, p.length, R * p[i])[axis].toFixed(1))
    .join(";");
}
function keyTimes(count: number): string {
  const segs = count; // count = frames incl. wrap
  return Array.from({ length: segs }, (_, k) => (k / (segs - 1)).toFixed(4)).join(";");
}
function keySplines(count: number): string {
  return Array.from({ length: count - 1 }, () => "0.42 0 0.58 1").join(";");
}

function SmoothAnimate({ attributeName, values, n }: { attributeName: string; values: string; n: number }) {
  return (
    <animate
      attributeName={attributeName}
      values={values}
      dur={DUR}
      calcMode="spline"
      keyTimes={keyTimes(n)}
      keySplines={keySplines(n)}
      repeatCount="indefinite"
    />
  );
}

export function ScorecardPreviewRadar() {
  const [animate, setAnimate] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setAnimate(!mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const n = AXES.length;
  const frames = YOU_PROFILES.length + 1; // incl. seamless wrap frame
  const rings = [0.25, 0.5, 0.75, 1];
  const youPoints = joinPoints(YOU_PROFILES);
  const benchPoints = joinPoints(BENCH_PROFILES);

  return (
    <figure className="sc-preview" aria-hidden="true">
      <svg className="sc-preview-radar" viewBox={`0 0 ${W} ${H}`} role="presentation">
        {rings.map((f, i) => (
          <polygon
            key={i}
            className="sc-preview-grid"
            points={AXES.map((_, j) => point(j, n, R * f).join(",")).join(" ")}
          />
        ))}
        {AXES.map((_, i) => {
          const [x, y] = point(i, n, R);
          return <line key={i} className="sc-preview-spoke" x1={CX} y1={CY} x2={x} y2={y} />;
        })}

        <polygon className="sc-preview-benchmark" points={shape(BENCH_PROFILES[0])}>
          {animate ? <SmoothAnimate attributeName="points" values={benchPoints} n={frames} /> : null}
        </polygon>

        <polygon className="sc-preview-area" points={shape(YOU_PROFILES[0])}>
          {animate ? <SmoothAnimate attributeName="points" values={youPoints} n={frames} /> : null}
        </polygon>

        {AXES.map((_, i) => {
          const [dx, dy] = point(i, n, R * YOU_PROFILES[0][i]);
          return (
            <circle key={i} className="sc-preview-dot" cx={dx} cy={dy} r={4}>
              {animate ? (
                <>
                  <SmoothAnimate attributeName="cx" values={axisValues(YOU_PROFILES, i, 0)} n={frames} />
                  <SmoothAnimate attributeName="cy" values={axisValues(YOU_PROFILES, i, 1)} n={frames} />
                </>
              ) : null}
            </circle>
          );
        })}

        {AXES.map((label, i) => {
          const [lx, ly] = point(i, n, LABEL_R);
          const anchor = Math.abs(lx - CX) < 6 ? "middle" : lx > CX ? "start" : "end";
          return (
            <text key={label} className="sc-preview-label" x={lx} y={ly} textAnchor={anchor} dominantBaseline="middle">
              {label}
            </text>
          );
        })}
      </svg>
    </figure>
  );
}
