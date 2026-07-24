/**
 * Value-stack vignettes - one fake-UI illustration per outcome tile, matched to
 * the designer's Section 2 mockups (State 1 -> State 2).
 *
 * Decorative (aria-hidden), no copy that a screen reader needs. The baseline
 * markup renders the finished "after" state, so under reduced-motion the static
 * image is the resolved result. The before->after story is a gentle, seamless
 * loop layered on in CSS, keyed off the parent `.value-tile.is-inview`.
 */

import { NexubisLogo } from "@/components/NexubisLogo";

function StarGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3.6l2.32 4.7 5.18.76-3.75 3.65.885 5.16L12 15.43l-4.635 2.44.885-5.16L4.5 9.06l5.18-.76L12 3.6z" />
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
      <path
        d="M12 3c3 1.5 5 4.5 5 8 0 2-.6 3.6-1.4 5H8.4C7.6 14.6 7 13 7 11c0-3.5 2-6.5 5-8Z"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="1.6" fill="currentColor" stroke="none" />
      <path
        d="M9 18c-1 1-1.4 2.5-1.4 3.5M15 18c1 1 1.4 2.5 1.4 3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M5 12.5l4.5 4.5L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GlobeGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.4 2.3 3.6 5.3 3.6 8.5S14.4 18.2 12 20.5c-2.4-2.3-3.6-5.3-3.6-8.5S9.6 5.8 12 3.5Z" />
    </svg>
  );
}

function PencilGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path
        d="M14.5 5.5l4 4L9 19l-4.5 1L5.5 15.5 14.5 5.5Z"
        strokeLinejoin="round"
      />
      <path d="M13 7l4 4" strokeLinecap="round" />
    </svg>
  );
}

function BoxGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path
        d="M12 3.5l7.5 4v9L12 20.5 4.5 16.5v-9L12 3.5Z"
        strokeLinejoin="round"
      />
      <path d="M4.7 7.6 12 11.6l7.3-4M12 11.6V20.5" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="4" y="5.5" width="16" height="14" rx="2" />
      <path d="M4 9.5h16M8.5 3.5v4M15.5 3.5v4" strokeLinecap="round" />
    </svg>
  );
}

/** 01 - Buyers see your worth: the branded card lifts and wins over the plain one. */
export function ValueWorthVignette() {
  return (
    <div className="vg vg-worth" data-vignette aria-hidden="true">
      <div className="vv-worth-brand">
        <span className="vv-ribbon">
          <StarGlyph />
        </span>
        <span className="vv-thumb vv-thumb-brand">
          <NexubisLogo className="vv-nx" markOnly color="red" />
        </span>
        <span className="vv-label">
          Built By <b>nexubis</b>
        </span>
        <span className="vv-line" />
        <span className="vv-line vv-line-sm" />
        <span className="vv-cta" />
      </div>
      <div className="vv-worth-plain">
        <span className="vv-thumb" />
        <span className="vv-label vv-label-muted">Built Without Strategy</span>
        <span className="vv-line" />
        <span className="vv-line vv-line-sm" />
        <span className="vv-bar" />
      </div>
    </div>
  );
}

function MiniCard({ className = "" }: { className?: string }) {
  return (
    <span className={`vv-ocard ${className}`.trim()}>
      <span className="vv-ocard-thumb" />
      <span className="vv-ocard-line" />
      <span className="vv-ocard-line vv-ocard-line-sm" />
      <span className="vv-ocard-cta" />
    </span>
  );
}

/**
 * 02 - More output, faster turnaround: a card lifts off the left pile, travels
 * across, and lands on the growing right pile; the timer ring fills across one
 * trip and resets as the card lands. Loops - each trip = one more deliverable.
 */
export function ValueOutputVignette() {
  return (
    <div className="vg vg-output" data-vignette aria-hidden="true">
      <div className="vv-pile vv-pile-left">
        <MiniCard className="vv-lb" />
        <MiniCard className="vv-lf" />
      </div>
      <span className="vv-arrow">
        <ArrowGlyph />
      </span>
      <div className="vv-pile vv-pile-right">
        <MiniCard className="vv-r4" />
        <MiniCard className="vv-r3" />
        <MiniCard className="vv-r2" />
        <MiniCard className="vv-r1" />
      </div>
      <MiniCard className="vv-flyer" />
      <span className="vv-ring">
        <svg viewBox="0 0 36 36">
          <circle className="vv-ring-track" cx="18" cy="18" r="15" />
          <circle className="vv-ring-fill" cx="18" cy="18" r="15" />
        </svg>
      </span>
    </div>
  );
}

// Icon per row plus the two skeleton-line widths (staggered, from the design).
const launchRows = [
  [GlobeGlyph, ["26%", "74%"]],
  [PencilGlyph, ["64%", "44%"]],
  [BoxGlyph, ["57%", "72%"]],
  [CalendarGlyph, ["64%", "44%"]],
] as const;

/** 03 - Brand ready for every launch: the checklist completes and the pill publishes. */
export function ValueLaunchVignette() {
  return (
    <div className="vg vg-launch" data-vignette aria-hidden="true">
      <div className="vv-checklist">
        {launchRows.map(([Icon, widths], index) => (
          <span className="vv-check-row" key={index}>
            <span className="vv-icon">
              <span className="vv-icon-glyph">
                <Icon />
              </span>
              <span className="vv-icon-check">
                <CheckGlyph />
              </span>
            </span>
            <span className="vv-check-lines">
              <span style={{ width: widths[0] }} />
              <span style={{ width: widths[1] }} />
            </span>
          </span>
        ))}
      </div>
      <span className="vv-published">
        <span>Published</span>
        <RocketGlyph />
        <span className="vv-shine" />
      </span>
    </div>
  );
}
