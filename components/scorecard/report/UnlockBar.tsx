"use client";

// Sticky unlock bar for the teaser: a fixed strip along the bottom of the
// screen (desktop and mobile), the ONLY unlock surface on the page. Its
// button opens the unlock form in a modal, and every locked-section nudge
// link opens the same modal (event delegation below), so there is exactly
// one form to maintain and no form parked at the bottom of a long page.
import { useEffect, useState } from "react";
import { TEASER } from "@/lib/scorecard/copy";
import { UnlockPanel } from "./UnlockPanel";

export function UnlockBar({ runId }: { runId: string }) {
  const [open, setOpen] = useState(false);

  // The locked-section nudges are server-rendered plain anchors; intercepting
  // them here keeps the report component server-side while still opening the
  // modal instead of jumping to a hash.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target instanceof Element ? e.target.closest("a.sc-locked-nudge") : null;
      if (!target) return;
      e.preventDefault();
      setOpen(true);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // Lock body scroll while the modal is open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <div className="sc-unlock-bar" role="complementary" aria-label="Unlock the full report">
        <p className="sc-unlock-bar-line">{TEASER.stickyLine}</p>
        <button className="btn btn-primary sc-unlock-bar-button" type="button" onClick={() => setOpen(true)}>
          {TEASER.stickyButton}
        </button>
      </div>

      {open ? (
        <div className="sc-unlock-modal" role="dialog" aria-modal="true" aria-label="Unlock your full report">
          <div className="sc-unlock-modal-backdrop" onClick={() => setOpen(false)} />
          <div className="sc-unlock-modal-card">
            <button className="sc-unlock-modal-close" type="button" aria-label="Close" onClick={() => setOpen(false)}>
              <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true">
                <path d="M2 2l10 10M12 2 2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <UnlockPanel runId={runId} />
          </div>
        </div>
      ) : null}
    </>
  );
}
