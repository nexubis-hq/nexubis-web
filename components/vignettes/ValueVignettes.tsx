/**
 * Value-stack vignettes - one fake-UI illustration per outcome tile.
 * Decorative (aria-hidden), no copy added. Looping motion keys off the
 * parent `.value-tile.is-inview`; loops live in CSS and stop under
 * reduced-motion, where the static baseline is the finished state.
 */

function CursorGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M5 3l6.5 15.5 2-6 6-2L5 3z" />
    </svg>
  );
}

function ImageGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="8.5" cy="8.5" r="1.8" fill="currentColor" stroke="none" />
      <path
        d="M4 17.5l4.8-5.2 3.6 3.8 3.2-3.4 4.4 4.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
      <path d="M12 5.5v13M5.5 12h13" strokeLinecap="round" />
    </svg>
  );
}

function ArrowGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M4 12h15m0 0-5.5-5.5M19 12l-5.5 5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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

function MiniCard({ className = "" }: { className?: string }) {
  return (
    <span className={`vv-mini ${className}`.trim()}>
      <span className="vv-mini-thumb" />
      <span className="vv-mini-line" />
      <span className="vv-mini-cta" />
    </span>
  );
}

/** 01 - Buyers see your worth: the branded product is picked over the cheaper one. */
export function ValueWorthVignette() {
  return (
    <div className="vg vg-worth" data-vignette aria-hidden="true">
      <div className="vv-card vv-card-plain">
        <span className="vv-card-thumb">
          <ImageGlyph />
        </span>
        <span className="vv-card-line" />
        <span className="vv-card-line vv-card-line-sm" />
        <span className="vv-cta vv-cta-plain" />
      </div>
      <div className="vv-card vv-card-brand">
        <span className="vv-ring" />
        <span className="vv-card-mark">
          <PlusGlyph />
        </span>
        <span className="vv-card-thumb vv-thumb-brand">
          <ImageGlyph />
        </span>
        <span className="vv-card-line" />
        <span className="vv-card-line vv-card-line-sm" />
        <span className="vv-cta" />
      </div>
      <span className="vg-cursor vv-cursor">
        <CursorGlyph />
      </span>
    </div>
  );
}

/** 02 - More output, faster turnaround: one brief multiplies into a stack of deliverables. */
export function ValueOutputVignette() {
  return (
    <div className="vg vg-output" data-vignette aria-hidden="true">
      <div className="vv-source">
        <MiniCard />
        <MiniCard className="vv-flyer" />
      </div>
      <span className="vv-arrow">
        <ArrowGlyph />
      </span>
      <div className="vv-stack">
        <MiniCard className="vv-s3" />
        <MiniCard className="vv-s2" />
        <MiniCard className="vv-s1" />
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

/** 03 - Brand ready for every launch: checklist completes into a Published pill. */
export function ValueLaunchVignette() {
  return (
    <div className="vg vg-launch" data-vignette aria-hidden="true">
      <div className="vv-checklist">
        {[0, 1, 2].map((row) => (
          <span className="vv-check-row" key={row}>
            <span className="vv-check" />
            <span className="vv-check-lines">
              <span />
              <span />
            </span>
          </span>
        ))}
      </div>
      <div className="vv-published">
        <RocketGlyph />
        <span>Published</span>
        <span className="vv-shine" />
      </div>
    </div>
  );
}
