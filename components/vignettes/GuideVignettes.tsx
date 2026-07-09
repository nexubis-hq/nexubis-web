/**
 * Guide proof-card diagrams - large "diagram" dioramas built from the designer's
 * illustrations, one per authority bullet. Decorative (aria-hidden). Idle loops
 * key off the parent `.guide-proof-cards.is-inview` in CSS; reduced-motion falls
 * back to the fully-assembled static diagram.
 *
 * Geometry is kept in the designer's 255 x 181 viewBox so proportions match the
 * source SVGs exactly; nodes are placed with percentage coordinates derived from
 * those files and recoloured to the site's charcoal + red palette.
 */

/* ---------------------------------- glyphs --------------------------------- */

function PeopleGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
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

// filled variations of the designer's Feather icons, white on the node colour.

function CodeMini() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8.5 7 3.8 12l4.7 5M15.5 7l4.7 5-4.7 5" />
    </svg>
  );
}

function GlobeMini() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <circle cx="12" cy="12" r="8.4" />
      <path d="M3.6 12h16.8M12 3.6c2.4 2.3 3.6 5.2 3.6 8.4S14.4 18.1 12 20.4c-2.4-2.3-3.6-5.2-3.6-8.4S9.6 5.9 12 3.6Z" />
    </svg>
  );
}

function PaletteMini() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.6a9.4 9.4 0 0 0 0 18.8 2.5 2.5 0 0 0 2.5-2.5c0-.66-.25-1.2-.65-1.66-.38-.42-.6-.86-.6-1.34a1.6 1.6 0 0 1 1.6-1.6h1.9a4.35 4.35 0 0 0 4.35-4.35C21.5 5.85 17.2 2.6 12 2.6ZM7.1 12.5a1.45 1.45 0 1 1 0-2.9 1.45 1.45 0 0 1 0 2.9Zm2.7-3.9a1.45 1.45 0 1 1 0-2.9 1.45 1.45 0 0 1 0 2.9Zm4.6 0a1.45 1.45 0 1 1 0-2.9 1.45 1.45 0 0 1 0 2.9Z" />
    </svg>
  );
}

function CubeMini() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.4l8.4 4.7L12 11.8 3.6 7.1 12 2.4Z" />
      <path d="M3.6 8.9l7.5 4.2v8.4l-7.5-4.2V8.9Z" opacity="0.7" />
      <path d="M20.4 8.9l-7.5 4.2v8.4l7.5-4.2V8.9Z" opacity="0.5" />
    </svg>
  );
}

function PenMini() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.7 3.3a2 2 0 0 1 2.83 0l1.17 1.17a2 2 0 0 1 0 2.83l-9.4 9.4-4.5 1.3a1 1 0 0 1-1.24-1.24l1.3-4.5 9.44-9.44Zm.88 2-1.3 1.3 1.42 1.42 1.3-1.3-1.42-1.42Z" />
    </svg>
  );
}

function CalendarCheckMini() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 2.6a1 1 0 0 1 1 1V4h6v-.4a1 1 0 1 1 2 0V4a3 3 0 0 1 3 3v1H4V7a3 3 0 0 1 3-3v-.4a1 1 0 0 1 1-1Z" />
      <path d="M4 9.6h16V18a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V9.6Zm11.7 3.1a1 1 0 0 0-1.4-1.4l-3.1 3.1-1.2-1.2a1 1 0 1 0-1.4 1.4l1.9 1.9a1 1 0 0 0 1.4 0l3.8-3.8Z" />
    </svg>
  );
}

function CheckMini() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  );
}

function PlusMini() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function BagMini() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 7.5a4 4 0 0 1 8 0V8h2.3a1.5 1.5 0 0 1 1.5 1.4l.68 9.5A2 2 0 0 1 18.5 21H5.5a2 2 0 0 1-2-2.1l.68-9.5A1.5 1.5 0 0 1 5.7 8H8v-.5Zm2 .5h4v-.5a2 2 0 1 0-4 0V8Z" />
    </svg>
  );
}

function CheckCircleMini() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8.6" />
      <path d="M8.4 12.3l2.5 2.5 4.7-5.1" />
    </svg>
  );
}

function BoxMini() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3l8 4.3v9.4L12 21l-8-4.3V7.3L12 3Z" opacity="0.5" />
      <path d="M12 3l8 4.3L12 11.6 4 7.3 12 3Z" />
      <path d="M12 11.6 20 7.3v9.4L12 21v-9.4Z" opacity="0.75" />
    </svg>
  );
}

function TruckMini() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="3" y="6" width="10.6" height="8" rx="1" />
      <path d="M13.6 8.5h3.55a1 1 0 0 1 .82.43l2.3 3.3a1 1 0 0 1 .18.57V14h-6.85V8.5Z" />
      <circle cx="7.3" cy="17" r="1.9" />
      <circle cx="16.7" cy="17" r="1.9" />
    </svg>
  );
}

function WarehouseMini() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M11.35 3.1a1 1 0 0 1 1.3 0l8 6.7a1 1 0 0 1 .35.77V20a1 1 0 0 1-1 1h-4.5v-6a2.5 2.5 0 0 0-5 0v6H4a1 1 0 0 1-1-1V10.57a1 1 0 0 1 .35-.77l8-6.7Z" />
    </svg>
  );
}

/* --------------------------- 1. team hub diagram --------------------------- */

// left bracket feeds the three left nodes into the hub's left side; right
// bracket mirrors it. Straight from the designer's Illustration 1 paths.
const HUB_TRACK_L =
  "M83.46 138.61H108.44C114.71 138.61 119.79 133.52 119.79 127.25V89.22M119.79 89.22H60.75M119.79 89.22V53.45C119.79 47.18 114.71 42.10 108.44 42.10H83.46";
const HUB_TRACK_R =
  "M169.75 138.61H144.77C138.50 138.61 133.42 133.52 133.42 127.25V89.22M133.42 89.22H192.46M133.42 89.22V53.45C133.42 47.18 138.50 42.10 144.77 42.10H169.75";

// x / y are percentages of the 255 x 181 viewBox; d is the loop delay (s).
const hubNodes = [
  { Glyph: CodeMini, x: 30.8, y: 23.0, d: 0.0 },
  { Glyph: GlobeMini, x: 20.7, y: 50.0, d: 0.45 },
  { Glyph: PaletteMini, x: 30.8, y: 77.0, d: 0.9 },
  { Glyph: CubeMini, x: 69.5, y: 23.0, d: 0.2 },
  { Glyph: PenMini, x: 79.3, y: 50.0, d: 0.65 },
  { Glyph: CalendarCheckMini, x: 69.5, y: 77.0, d: 1.1 },
] as const;

/** One team, not five suppliers: channels routing into one red team hub. */
export function GuideTeamVignette() {
  return (
    <div className="gv gv-hub" data-vignette aria-hidden="true">
      <svg className="gv-hub-lines" viewBox="0 0 255 181" fill="none" preserveAspectRatio="xMidYMid meet">
        <path className="gv-hub-track" d={HUB_TRACK_L} />
        <path className="gv-hub-track" d={HUB_TRACK_R} />
        <path className="gv-hub-flow gv-hub-flow-1" d={HUB_TRACK_L} />
        <path className="gv-hub-flow gv-hub-flow-2" d={HUB_TRACK_R} />
      </svg>
      {hubNodes.map(({ Glyph, x, y, d }, i) => {
        // offset from this node back to the box centre, in the node's own box
        // (node is 13% of the box wide; the box is 255:181), so transform can
        // start each icon behind the core and ride it out along the line.
        const tx = ((50 - x) * 100) / 13;
        const ty = (((50 - y) * (181 / 255)) * 100) / 13;
        return (
          <span
            className={`gv-hn gv-hn-${i + 1}`}
            key={i}
            style={{
              left: `${x}%`,
              top: `${y}%`,
              ["--tx" as string]: `${tx.toFixed(1)}%`,
              ["--ty" as string]: `${ty.toFixed(1)}%`,
              ["--d" as string]: `${d}s`,
            }}
          >
            <Glyph />
          </span>
        );
      })}
      <span className="gv-hub-core">
        <PeopleGlyph />
      </span>
    </div>
  );
}

/* ---------------------------- 2. growth diagram ---------------------------- */

// staircase of stacked circles rising left-to-right; the top of each column is a
// red "+" (scope added), the rest charcoal checks (delivered). Delays are timed
// so the columns light up as the diagonal arrow sweeps up and to the right.
const scopeNodes = [
  { x: 19.1, y: 80.3, kind: "check", d: 0.4 },
  { x: 37.7, y: 80.3, kind: "check", d: 0.9 },
  { x: 37.7, y: 60.3, kind: "plus", d: 1.1 },
  { x: 56.2, y: 80.3, kind: "check", d: 1.5 },
  { x: 56.2, y: 60.3, kind: "check", d: 1.7 },
  { x: 56.2, y: 40.3, kind: "plus", d: 1.9 },
  { x: 74.8, y: 80.3, kind: "check", d: 2.2 },
  { x: 74.8, y: 60.3, kind: "check", d: 2.4 },
  { x: 74.8, y: 40.3, kind: "check", d: 2.6 },
  { x: 74.8, y: 20.2, kind: "plus", hot: true, d: 2.9 },
] as const;

/** Scope expands over time: a rising staircase with a red growth arrow. */
export function GuideScopeVignette() {
  return (
    <div className="gv gv-growth" data-vignette aria-hidden="true">
      <svg className="gv-growth-lines" viewBox="0 0 255 181" fill="none" preserveAspectRatio="xMidYMid meet">
        <path className="gv-base" d="M49 146.5H216" pathLength={100} />
        <path className="gv-base-head" d="M211 141.5L219 146.5L211 151.5" />
        <path className="gv-rise" d="M51 148L213 21" pathLength={100} />
        <path className="gv-rise-head" d="M205 20.5L214.5 19.2L214 28.7" />
      </svg>
      {scopeNodes.map((n, i) => (
        <span
          className={`gv-gc gv-gc-${n.kind}${"hot" in n && n.hot ? " gv-gc-hot" : ""}`}
          key={i}
          style={{ left: `${n.x}%`, top: `${n.y}%`, ["--d" as string]: `${n.d}s` }}
        >
          {n.kind === "plus" ? <PlusMini /> : <CheckMini />}
        </span>
      ))}
    </div>
  );
}

/* -------------------------- 3. industrial diagram -------------------------- */

// designer geometry (Illustration 3), kept in the source 255 x 181 viewBox so
// nothing has to be re-plotted: funnel, roller belt, packaged-box output, and
// the red track that loops the five production-stage nodes.
const FUNNEL_D =
  "M23 18.95C23 18.57 23.15 18.2 23.43 17.93C23.7 17.66 24.07 17.51 24.46 17.51H67.56C67.95 17.51 68.32 17.66 68.59 17.93C68.86 18.2 69.02 18.57 69.02 18.95V21.21C69.02 21.57 68.88 21.91 68.64 22.17L56.15 35.87C55.99 36.04 55.9 36.27 55.9 36.51V41C55.9 41.31 55.8 41.6 55.62 41.84C55.46 42.07 55.23 42.24 54.97 42.34L38.11 45.23C37.77 45.32 37.36 45.33 37.36 45.3C37.13 45.27 36.91 45.18 36.72 45.04C36.54 44.91 36.38 44.74 36.28 44.53C36.17 44.33 36.12 44.11 36.12 43.88V36.51C36.12 36.27 36.03 36.04 35.87 35.87L23.37 22.17C23.13 21.91 23 21.57 23 21.21V18.95Z";
const OUTBOX_D =
  "M221.09 111.71C220.23 111.71 219.42 111.24 218.98 110.48L216.53 106.31C216.16 105.67 215.25 105.67 214.88 106.31L212.43 110.48C211.99 111.24 211.18 111.71 210.32 111.71C210.09 111.71 209.86 111.68 209.64 111.61L203.89 109.92C203.28 109.74 202.66 110.2 202.66 110.84V118.89C202.66 119.66 203.17 120.33 203.9 120.52L214.91 123.35C215.43 123.48 215.97 123.48 216.49 123.35L227.51 120.52C228.23 120.33 228.74 119.66 228.74 118.89V110.84C228.74 110.2 228.13 109.74 227.51 109.92L221.76 111.61C221.54 111.68 221.32 111.71 221.09 111.71ZM231.91 105.83L229.29 100.44C229.13 100.11 228.79 99.92 228.44 99.97L215.7 101.64L220.37 109.62C220.57 109.95 220.95 110.1 221.32 110L231.39 107.04C231.9 106.89 232.14 106.31 231.91 105.83ZM202.11 100.44L199.49 105.83C199.26 106.31 199.51 106.89 200.01 107.03L210.09 109.99C210.45 110.1 210.83 109.94 211.03 109.61L215.7 101.64L202.96 99.97C202.61 99.93 202.27 100.11 202.11 100.44Z";
const ROLLERS = [47.45, 68.86, 90.27, 111.68, 133.09, 154.5, 175.91];
// top rail (machine -> check -> right), down the right side, bottom rail back to
// the factory. pathLength=100 lets a short dash "flow" around it in percentages.
const TRACK_D =
  "M45.65 84.62H204.11A11.57 11.57 0 0 1 215.68 96.19V136.79A11.57 11.57 0 0 1 204.11 148.36H62.79";

// five stage nodes wired in flow order; x/y are percentages of the viewBox.
// d is the pulse delay, timed to the flow's leading edge reaching each node
// (the flow itself waits ~1s while the bead drops - see gv-track-flow). Every
// node shares one light base shade (set in CSS) and only reddens when hit.
const flowNodes = [
  { Glyph: BagMini, x: 17.9, y: 46.6, d: 1.0 },
  { Glyph: CheckCircleMini, x: 52.1, y: 46.6, d: 1.45 },
  { Glyph: BoxMini, x: 84.5, y: 82.0, d: 3.65 },
  { Glyph: TruckMini, x: 52.1, y: 82.0, d: 4.9 },
  { Glyph: WarehouseMini, x: 17.9, y: 82.0, d: 6.0 },
] as const;

/** We speak industrial: material flows the full production loop, one stage lit at a time. */
export function GuideIndustrialVignette() {
  return (
    <div className="gv gv-flow" data-vignette aria-hidden="true">
      <svg className="gv-flow-lines" viewBox="0 0 255 181" fill="none" preserveAspectRatio="xMidYMid meet">
        <path className="gv-track" d={TRACK_D} />
        <path className="gv-track-head" d="M66.88 144.28L62.79 148.36L66.88 152.45" />
        <path className="gv-track-flow" d={TRACK_D} pathLength={100} />
        <path className="gv-funnel" d={FUNNEL_D} />
        <circle className="gv-bead" cx="46.01" cy="57.78" r="4.79" />
        <rect className="gv-belt" x="31.63" y="99.96" width="160.1" height="23.97" rx="11.98" />
        {ROLLERS.map((cx) => (
          <circle className="gv-roller" key={cx} cx={cx} cy="111.95" r="6.23" />
        ))}
        <path className="gv-out" d={OUTBOX_D} />
      </svg>
      {flowNodes.map(({ Glyph, x, y, d }, i) => (
        <span
          className="gv-fn"
          key={i}
          style={{ left: `${x}%`, top: `${y}%`, ["--d" as string]: `${d}s` }}
        >
          <Glyph />
        </span>
      ))}
    </div>
  );
}
