/**
 * Value-stack vignettes — one fake-UI illustration per outcome tile.
 * Decorative (aria-hidden), no copy added. Entry/idle motion keys off the
 * parent `.value-tile.is-inview`; loops and hover live in CSS and stop under
 * reduced-motion.
 */

function CursorGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M5 3l6.5 15.5 2-6 6-2L5 3z" />
    </svg>
  );
}

function RocketGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M12 3c3 1.5 5 4.5 5 8 0 2-.6 3.6-1.4 5H8.4C7.6 14.6 7 13 7 11c0-3.5 2-6.5 5-8Z" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="1.6" fill="currentColor" stroke="none" />
      <path d="M9 18c-1 1-1.4 2.5-1.4 3.5M15 18c1 1 1.4 2.5 1.4 3.5" strokeLinecap="round" />
    </svg>
  );
}

/** 01 — Buyers see your worth: the branded product is picked over the cheaper one. */
export function ValueWorthVignette() {
  return (
    <div className="vg vg-worth" data-vignette aria-hidden="true">
      <div className="vv-card vv-card-plain">
        <span className="vv-card-thumb" />
        <span className="vv-card-line" />
        <span className="vv-tag" />
      </div>
      <div className="vv-card vv-card-brand">
        <span className="vv-card-mark" />
        <span className="vv-card-thumb" />
        <span className="vv-card-line" />
        <span className="vv-tag vv-tag-high" />
        <span className="vv-ring" />
      </div>
      <span className="vg-cursor vv-cursor">
        <CursorGlyph />
      </span>
    </div>
  );
}

/** 02 — More output, faster turnaround: deliverables fly off a queue past a timer. */
export function ValueOutputVignette() {
  return (
    <div className="vg vg-output" data-vignette aria-hidden="true">
      <div className="vv-queue">
        <span className="vv-deliverable vv-d1">
          <span className="vv-d-line" />
          <span className="vv-d-line" />
        </span>
        <span className="vv-deliverable vv-d2">
          <span className="vv-d-bar" />
        </span>
        <span className="vv-deliverable vv-d3">
          <span className="vv-d-cube" />
        </span>
      </div>
      <div className="vv-timer">
        <svg viewBox="0 0 36 36">
          <circle className="vv-timer-track" cx="18" cy="18" r="15" />
          <circle className="vv-timer-fill" cx="18" cy="18" r="15" />
        </svg>
      </div>
    </div>
  );
}

/** 03 — Brand ready for every launch: checklist completes into a Published pill. */
export function ValueLaunchVignette() {
  return (
    <div className="vg vg-launch" data-vignette aria-hidden="true">
      <div className="vv-checklist">
        <span className="vv-check-row">
          <span className="vv-check" />
          <span className="vv-check-bar" />
        </span>
        <span className="vv-check-row">
          <span className="vv-check" />
          <span className="vv-check-bar" />
        </span>
        <span className="vv-check-row">
          <span className="vv-check" />
          <span className="vv-check-bar" />
        </span>
      </div>
      <div className="vv-published">
        <RocketGlyph />
        <span>Published</span>
      </div>
    </div>
  );
}
