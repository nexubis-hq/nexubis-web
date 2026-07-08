/**
 * Guide proof-card vignettes - soft "glass" icon dioramas, one per authority
 * bullet. Decorative (aria-hidden). Loops key off the parent
 * `.guide-proof-cards.is-inview` in CSS; reduced-motion shows the static state.
 */

function PeopleGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <circle cx="9" cy="8.6" r="3" />
      <circle cx="16.2" cy="9.6" r="2.4" opacity="0.85" />
      <path d="M3.8 18.4c0-2.7 2.3-4.5 5.2-4.5s5.2 1.8 5.2 4.5v0.6H3.8v-0.6Z" />
      <path
        d="M15.6 19h4.6v-0.6c0-2-1.5-3.5-3.7-3.8 0.9 1 1.5 2.3 1.5 3.8V19Z"
        opacity="0.85"
      />
    </svg>
  );
}

function BrowserMini() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 6a2.4 2.4 0 0 1 2.4-2.4h11.2A2.4 2.4 0 0 1 20 6v2H4V6Z" />
      <path d="M4 9.6h16v8.4a2.4 2.4 0 0 1-2.4 2.4H6.4A2.4 2.4 0 0 1 4 18V9.6Z" opacity="0.5" />
    </svg>
  );
}

function PenMini() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.5l5.8 8.7L12 21.5l-5.8-10.3L12 2.5Z" />
    </svg>
  );
}

function CubeMini() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.4l8.4 4.7L12 11.8 3.6 7.1 12 2.4Z" />
      <path d="M3.6 8.9l7.5 4.2v8.4l-7.5-4.2V8.9Z" opacity="0.7" />
      <path d="M20.4 8.9l-7.5 4.2v8.4l7.5-4.2V8.9Z" opacity="0.5" />
    </svg>
  );
}

function PlayMini() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5.2v13.6a1 1 0 0 0 1.5 0.9l10.6-6.8a1 1 0 0 0 0-1.7L9.5 4.3A1 1 0 0 0 8 5.2Z" />
    </svg>
  );
}

function FactoryMini() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M3.5 20.5V9l5 3.2V9l5 3.2V9l7 4.4v7.1h-17Z" />
      <rect x="16.5" y="3" width="3" height="6" rx="0.8" opacity="0.7" />
    </svg>
  );
}

const hubNodes = [BrowserMini, PenMini, CubeMini, PlayMini, FactoryMini];

/** One team, not five suppliers: channels orbiting one glowing team hub. */
export function GuideTeamVignette() {
  return (
    <div className="gv gv-hub" data-vignette aria-hidden="true">
      <svg className="gv-hub-stems" viewBox="0 0 100 100" fill="none" stroke="currentColor">
        <path d="M50 50 50 12M50 50 13 32M50 50 87 32M50 50 22 84M50 50 78 84" />
      </svg>
      {hubNodes.map((Glyph, index) => (
        <span className={`gv-node gv-node-${index + 1}`} key={index}>
          <Glyph />
        </span>
      ))}
      <span className="gv-orb">
        <PeopleGlyph />
      </span>
    </div>
  );
}

/** Scope expands over time: rising glass bars with a red growth arrow. */
export function GuideScopeVignette() {
  return (
    <div className="gv gv-growth" data-vignette aria-hidden="true">
      <div className="gv-bars">
        <span className="gv-bar gv-bar-1" />
        <span className="gv-bar gv-bar-2" />
        <span className="gv-bar gv-bar-3" />
      </div>
      <span className="gv-baseline" />
      <svg className="gv-growth-arrow" viewBox="0 0 64 44" fill="none" stroke="currentColor">
        <path className="gv-arrow-path" d="M5 38C22 34 34 26 51 11" strokeWidth="3.2" strokeLinecap="round" />
        <path
          className="gv-arrow-head"
          d="M43 8.5l9.5-1.8-1 9.6"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

/** We speak industrial: a hopper feeds red granules onto a conveyor. */
export function GuideIndustrialVignette() {
  return (
    <div className="gv gv-flow" data-vignette aria-hidden="true">
      <svg className="gv-hopper" viewBox="0 0 48 26" fill="currentColor">
        <path d="M3 4a2 2 0 0 1 2-2h38a2 2 0 0 1 2 2l-14.5 13v6a1.6 1.6 0 0 1-1.6 1.6h-9.8a1.6 1.6 0 0 1-1.6-1.6v-6L3 4Z" />
      </svg>
      <span className="gv-grain gv-grain-1" />
      <span className="gv-grain gv-grain-2" />
      <span className="gv-grain gv-grain-3" />
      <span className="gv-pile" />
      <div className="gv-belt">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
