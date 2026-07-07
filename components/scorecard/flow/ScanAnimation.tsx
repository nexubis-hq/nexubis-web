"use client";

// The scan animation: a stage checklist driven by REAL pipeline events, with a
// progress bar that eases forward between stages and never claims completion
// before the server does. Tolerates the real duration (a fresh run takes up to
// about 90 seconds; cache replays land in a blink).
import { useEffect, useRef, useState } from "react";
import { SCAN_STAGES } from "@/lib/scorecard/copy";
import type { ScanStage } from "@/lib/scorecard/orchestrator";

const STAGE_ORDER: ScanStage[] = ["reading", "impressions", "competitors", "scoring"];
// Each stage's progress ceiling: the bar crawls toward it while the stage
// runs, jumps past it when the next real event arrives.
const CEILINGS: Record<ScanStage, number> = { reading: 22, impressions: 48, competitors: 72, scoring: 93 };

export function ScanAnimation({ stage, company }: { stage: ScanStage; company: string }) {
  const [progress, setProgress] = useState(4);
  const target = CEILINGS[stage];
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setProgress(target);
      return;
    }
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setProgress((p) => {
        const gap = target - p;
        // Fast catch-up after a stage jump, slow crawl near the ceiling.
        const speed = gap > 10 ? 18 : 1.2;
        return Math.min(target, p + speed * dt);
      });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [target]);

  const activeIndex = STAGE_ORDER.indexOf(stage);

  return (
    <div className="sc-scan" role="status" aria-live="polite">
      <p className="sc-scan-company">Checking {company}</p>
      <div className="sc-scan-bar" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>
      <ol className="sc-scan-stages">
        {STAGE_ORDER.map((s, i) => (
          <li key={s} className={i < activeIndex ? "is-done" : i === activeIndex ? "is-active" : undefined}>
            <span className="sc-scan-tick" aria-hidden="true" />
            {SCAN_STAGES[s]}
          </li>
        ))}
      </ol>
      <p className="sc-scan-note">This usually takes about a minute. Your result appears right here.</p>
    </div>
  );
}
