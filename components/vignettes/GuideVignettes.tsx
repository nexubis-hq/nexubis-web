/**
 * Guide proof-card vignettes — small fake-diagram illustrations, one per
 * authority bullet. Decorative (aria-hidden). Idle motion keys off the parent
 * `.guide-proof-cards.is-inview` in CSS; reduced-motion shows the static state.
 */

/** One team, not five suppliers: five nodes collapsing into one Nexubis node. */
export function GuideTeamVignette() {
  return (
    <div className="gv gv-team" data-vignette aria-hidden="true">
      <svg viewBox="0 0 120 64" fill="none">
        <path
          className="gv-team-wire"
          d="M14 8 H70 M14 22 H70 M14 36 H70 M14 50 H70 M14 58 H70"
          stroke="currentColor"
        />
        <g className="gv-team-suppliers">
          <circle cx="14" cy="8" r="4" />
          <circle cx="14" cy="22" r="4" />
          <circle cx="14" cy="36" r="4" />
          <circle cx="14" cy="50" r="4" />
          <circle cx="14" cy="58" r="4" />
        </g>
        <circle className="gv-team-hub" cx="96" cy="32" r="11" />
        <path className="gv-team-join" d="M70 8 Q96 8 96 32 M70 58 Q96 58 96 32 M70 32 H85" stroke="currentColor" />
      </svg>
    </div>
  );
}

/** Scope expands over time: a widening engagement bar across a short timeline. */
export function GuideScopeVignette() {
  return (
    <div className="gv gv-scope" data-vignette aria-hidden="true">
      <div className="gv-scope-track">
        <span className="gv-scope-bar gv-scope-1" />
        <span className="gv-scope-bar gv-scope-2" />
        <span className="gv-scope-bar gv-scope-3" />
      </div>
      <div className="gv-scope-axis">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

/** We speak industrial: a row of hand-drawn sector glyphs (machine, valve, hopper). */
export function GuideIndustrialVignette() {
  return (
    <div className="gv gv-industrial" data-vignette aria-hidden="true">
      <svg viewBox="0 0 32 32" className="gv-glyph" fill="none" stroke="currentColor">
        <rect x="5" y="12" width="16" height="12" rx="1.5" />
        <rect x="21" y="15" width="6" height="7" rx="1" />
        <circle cx="10" cy="18" r="2.4" />
        <circle cx="16" cy="18" r="2.4" />
        <path d="M5 26h22" strokeLinecap="round" />
      </svg>
      <svg viewBox="0 0 32 32" className="gv-glyph" fill="none" stroke="currentColor">
        <path d="M16 6v6M16 20v6" strokeLinecap="round" />
        <path d="M10 12h12l-3 4v0a3 3 0 0 1-6 0v0l-3-4Z" strokeLinejoin="round" />
        <path d="M12 26h8" strokeLinecap="round" />
      </svg>
      <svg viewBox="0 0 32 32" className="gv-glyph" fill="none" stroke="currentColor">
        <path d="M7 7h18l-4 11h-10L7 7Z" strokeLinejoin="round" />
        <path d="M13 18l-1 5h8l-1-5" strokeLinejoin="round" />
        <path d="M11 12h10" />
      </svg>
    </div>
  );
}
