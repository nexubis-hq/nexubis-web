"use client";

// The scan animation: a stage checklist driven by REAL pipeline events, with a
// determinate progress bar that eases forward between stages and never claims
// completion before the server does. Tolerates the real duration (a fresh run
// takes up to about 90 seconds; cache replays land in a blink).
//
// Beneath the checklist, a narration line names the fine-grained work of the
// CURRENT real stage, cycling through that stage's steps so the screen keeps
// moving even when a stage runs long. It never shows a line from a stage that
// has not started. When the server sends the detected one-liner, that personal
// beat lands in the sub-line and stays. Calm and technical, no jokes.
import { useEffect, useRef, useState } from "react";
import { SCAN_STAGES, SCAN_STEPS, SCAN_SUBLINE } from "@/lib/scorecard/copy";
import type { ScanStage } from "@/lib/scorecard/orchestrator";

const STAGE_ORDER: ScanStage[] = ["reading", "speed", "competitors", "scoring", "writing"];
// Each stage's progress ceiling: the bar crawls toward it while the stage
// runs, jumps past it when the next real event arrives.
const CEILINGS: Record<ScanStage, number> = { reading: 18, speed: 40, competitors: 60, scoring: 82, writing: 95 };
// How long each narration line holds before the next one in the stage. Kept
// under four seconds so no line ever feels stuck.
const STEP_INTERVAL_MS = 3600;

export function ScanAnimation({
  stage,
  company,
  detectedOneLiner = null,
}: {
  stage: ScanStage;
  company: string;
  detectedOneLiner?: string | null;
}) {
  const [progress, setProgress] = useState(4);
  const target = CEILINGS[stage];
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      raf.current = requestAnimationFrame(() => setProgress(target));
      return () => {
        if (raf.current) cancelAnimationFrame(raf.current);
      };
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

  // Narration: cycle the current real stage's fine steps. The counter resets to
  // the first step whenever the backend reports a new stage (a render-time
  // adjustment on the changed prop, the React "derive from a prop" pattern), so
  // the words only ever describe work that has genuinely started.
  const stageLines = SCAN_STEPS.filter((s) => s.stage === stage).map((s) => s.label);
  const [stepIndex, setStepIndex] = useState(0);
  const [seenStage, setSeenStage] = useState(stage);
  if (stage !== seenStage) {
    setSeenStage(stage);
    setStepIndex(0);
  }
  useEffect(() => {
    const id = window.setInterval(() => setStepIndex((i) => i + 1), STEP_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [stage]);
  const stepLabel = stageLines[stepIndex % stageLines.length];

  const subline = detectedOneLiner ? SCAN_SUBLINE.detected(detectedOneLiner) : SCAN_SUBLINE.holding[stage];

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
      <p className="sc-scan-label" key={stepLabel}>
        {stepLabel}
      </p>
      <p className={`sc-scan-subline${detectedOneLiner ? " sc-scan-subline-detected" : ""}`} key={subline}>
        {subline}
      </p>
      <p className="sc-scan-note">This usually takes about 2 minutes. Your result appears right here.</p>
    </div>
  );
}
