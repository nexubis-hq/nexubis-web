"use client";

import { useEffect, useRef, useState } from "react";

const R = 52;
const CIRC = 2 * Math.PI * R;

// Circular progress ring on repo tokens: the arc is the single red accent, the
// track a neutral tint. Fills from 0 to `value` (0-100) the first time it
// scrolls into view; reduced-motion shows the final state immediately.
export function ScoreRing({
  value,
  display,
  subLabel,
  ariaLabel,
}: {
  value: number | null;
  display: string;
  subLabel?: string | null;
  ariaLabel?: string;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      const id = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(id);
    }
    const io = new IntersectionObserver(
      (entries, obs) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            requestAnimationFrame(() => setShown(true));
            obs.unobserve(e.target);
          }
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const pct = value === null ? 0 : Math.max(0, Math.min(100, value));
  const offset = shown ? CIRC * (1 - pct / 100) : CIRC;
  const len = display.length;
  const valueFontPx = len <= 3 ? 34 : len === 4 ? 25 : 20;

  return (
    <svg
      ref={ref}
      className="sc-ring"
      viewBox="0 0 120 120"
      role="img"
      aria-label={ariaLabel ?? [display, subLabel].filter(Boolean).join(" ")}
    >
      <circle cx="60" cy="60" r={R} className="sc-ring-track" />
      <circle
        cx="60"
        cy="60"
        r={R}
        className="sc-ring-arc"
        strokeDasharray={CIRC}
        strokeDashoffset={offset}
      />
      <text
        x="60"
        y={subLabel ? 54 : 60}
        className="sc-ring-value"
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fontSize: `${valueFontPx}px` }}
      >
        {display}
      </text>
      {subLabel ? (
        <text x="60" y="80" className="sc-ring-unit" textAnchor="middle" dominantBaseline="central">
          {subLabel}
        </text>
      ) : null}
    </svg>
  );
}
