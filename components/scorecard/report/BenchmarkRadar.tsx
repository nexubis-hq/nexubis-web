// Per-category benchmark radar: the prospect as the filled red shape, each
// competitor as a stroked neutral outline. Pure SVG on repo tokens, reads well
// at mobile width (short axis labels, no legend clutter; the legend renders
// below in HTML). Server-renderable: no client hooks needed.
import type { CompanyScores } from "@/lib/scorecard/scoring";
import { categoryLabel } from "@/lib/scorecard/rubric";

const SHORT: Record<string, string> = {
  "Brand identity": "Brand",
  Website: "Website",
  "Product visuals": "Visuals",
  "Trade show and print": "Print",
  "Message clarity": "Message",
};

const SIZE = 300;
const C = SIZE / 2;
const R = 104;

function point(angle: number, radius: number): [number, number] {
  return [C + radius * Math.cos(angle), C + radius * Math.sin(angle)];
}

function shape(scores: CompanyScores, angleAt: (i: number) => number): string {
  return scores.categories
    .map((cat, i) => {
      const v = Math.max(0, Math.min(20, cat.total ?? 0)) / 20;
      return point(angleAt(i), R * v).join(",");
    })
    .join(" ");
}

export function BenchmarkRadar({ prospect, rivals }: { prospect: CompanyScores; rivals: CompanyScores[] }) {
  const n = prospect.categories.length;
  if (n < 3) return null;
  const angleAt = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const rings = [0.25, 0.5, 0.75, 1];
  const scoredRivals = rivals.filter((r) => r.scored && r.categories.length === n);

  return (
    <figure className="sc-radar-figure">
      <svg className="sc-radar" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="Credibility Score by category, you versus the competitors you named">
        {rings.map((f, i) => (
          <polygon key={i} className="sc-radar-grid" points={prospect.categories.map((_, j) => point(angleAt(j), R * f).join(",")).join(" ")} />
        ))}
        {prospect.categories.map((_, i) => {
          const [x, y] = point(angleAt(i), R);
          return <line key={i} className="sc-radar-spoke" x1={C} y1={C} x2={x} y2={y} />;
        })}
        {scoredRivals.map((r, ri) => (
          <polygon key={r.company} className={`sc-radar-rival sc-radar-rival-${ri}`} points={shape(r, angleAt)} />
        ))}
        <polygon className="sc-radar-area" points={shape(prospect, angleAt)} />
        {prospect.categories.map((cat, i) => {
          const v = Math.max(0, Math.min(20, cat.total ?? 0)) / 20;
          const [vx, vy] = point(angleAt(i), R * v);
          return <circle key={`v${i}`} className="sc-radar-dot" cx={vx} cy={vy} r={3.5} />;
        })}
        {prospect.categories.map((cat, i) => {
          const [lx, ly] = point(angleAt(i), R + 18);
          const label = categoryLabel(cat.key);
          const anchor = Math.abs(lx - C) < 4 ? "middle" : lx > C ? "start" : "end";
          return (
            <text key={`l${i}`} className="sc-radar-label" x={lx} y={ly} textAnchor={anchor} dominantBaseline="middle">
              {SHORT[label] ?? label}
            </text>
          );
        })}
      </svg>
      <figcaption className="sc-radar-legend">
        <span className="sc-radar-key sc-radar-key-you">{prospect.company}</span>
        {scoredRivals.map((r, ri) => (
          <span key={r.company} className={`sc-radar-key sc-radar-key-rival-${ri}`}>
            {r.company}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
