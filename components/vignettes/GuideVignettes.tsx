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

// Official Nexubis icon library, white on the node colour (fill inherits the
// node's `color`). Paths come straight from the designer's SVG exports.

function CodeMini() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M9.40098 16.6L4.80098 12L9.40098 7.4L8.00098 6L2.00098 12L8.00098 18L9.40098 16.6ZM14.601 16.6L19.201 12L14.601 7.4L16.001 6L22.001 12L16.001 18L14.601 16.6Z" />
    </svg>
  );
}

function GlobeMini() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M11.989 2C6.46902 2 1.99902 6.48 1.99902 12C1.99902 17.52 6.46902 22 11.989 22C17.519 22 21.999 17.52 21.999 12C21.999 6.48 17.519 2 11.989 2ZM18.919 8H15.969C15.649 6.75 15.189 5.55 14.589 4.44C16.429 5.07 17.959 6.35 18.919 8ZM11.999 4.04C12.829 5.24 13.479 6.57 13.909 8H10.089C10.519 6.57 11.169 5.24 11.999 4.04ZM4.25902 14C4.09902 13.36 3.99902 12.69 3.99902 12C3.99902 11.31 4.09902 10.64 4.25902 10H7.63902C7.55902 10.66 7.49902 11.32 7.49902 12C7.49902 12.68 7.55902 13.34 7.63902 14H4.25902ZM5.07902 16H8.02902C8.34902 17.25 8.80902 18.45 9.40902 19.56C7.56902 18.93 6.03902 17.66 5.07902 16ZM8.02902 8H5.07902C6.03902 6.34 7.56902 5.07 9.40902 4.44C8.80902 5.55 8.34902 6.75 8.02902 8ZM11.999 19.96C11.169 18.76 10.519 17.43 10.089 16H13.909C13.479 17.43 12.829 18.76 11.999 19.96ZM14.339 14H9.65902C9.56902 13.34 9.49902 12.68 9.49902 12C9.49902 11.32 9.56902 10.65 9.65902 10H14.339C14.429 10.65 14.499 11.32 14.499 12C14.499 12.68 14.429 13.34 14.339 14ZM14.589 19.56C15.189 18.45 15.649 17.25 15.969 16H18.919C17.959 17.65 16.429 18.93 14.589 19.56ZM16.359 14C16.439 13.34 16.499 12.68 16.499 12C16.499 11.32 16.439 10.66 16.359 10H19.739C19.899 10.64 19.999 11.31 19.999 12C19.999 12.69 19.899 13.36 19.739 14H16.359Z" />
    </svg>
  );
}

function PaletteMini() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3C7.03 3 3 7.03 3 12C3 16.97 7.03 21 12 21C12.83 21 13.5 20.33 13.5 19.5C13.5 19.11 13.35 18.76 13.11 18.49C12.88 18.23 12.73 17.88 12.73 17.5C12.73 16.67 13.4 16 14.23 16H16C18.76 16 21 13.76 21 11C21 6.58 16.97 3 12 3ZM6.5 12C5.67 12 5 11.33 5 10.5C5 9.67 5.67 9 6.5 9C7.33 9 8 9.67 8 10.5C8 11.33 7.33 12 6.5 12ZM9.5 8C8.67 8 8 7.33 8 6.5C8 5.67 8.67 5 9.5 5C10.33 5 11 5.67 11 6.5C11 7.33 10.33 8 9.5 8ZM14.5 8C13.67 8 13 7.33 13 6.5C13 5.67 13.67 5 14.5 5C15.33 5 16 5.67 16 6.5C16 7.33 15.33 8 14.5 8ZM17.5 12C16.67 12 16 11.33 16 10.5C16 9.67 16.67 9 17.5 9C18.33 9 19 9.67 19 10.5C19 11.33 18.33 12 17.5 12Z" />
    </svg>
  );
}

function CubeMini() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M11.6692 2.28176C11.8872 2.23876 12.1122 2.23876 12.3312 2.28176C12.5822 2.32976 12.8102 2.44876 13.0222 2.55876L13.0752 2.58676L21.3452 6.86676C21.4673 6.93 21.5696 7.02556 21.641 7.14302C21.7124 7.26047 21.7502 7.3953 21.7502 7.53276V15.4308C21.7502 15.7138 21.7522 16.0138 21.6572 16.2928C21.5736 16.5358 21.4389 16.7581 21.2622 16.9448C21.0572 17.1588 20.7892 17.2958 20.5392 17.4248L20.4762 17.4578L12.3452 21.6658C12.2386 21.721 12.1203 21.7498 12.0002 21.7498C11.8801 21.7498 11.7618 21.721 11.6552 21.6658L3.5242 17.4578L3.4612 17.4248C3.2112 17.2958 2.9432 17.1588 2.7382 16.9448C2.5615 16.7581 2.42681 16.5358 2.3432 16.2928C2.2482 16.0128 2.2492 15.7128 2.2502 15.4298V7.53276C2.25019 7.3953 2.28796 7.26047 2.35939 7.14302C2.43081 7.02556 2.53315 6.93 2.6552 6.86676L10.9242 2.58676L10.9772 2.55976C11.1902 2.44876 11.4172 2.32976 11.6692 2.28176ZM11.8952 3.77776C11.8002 3.82264 11.7061 3.86965 11.6132 3.91876L4.6682 7.51376L12.0002 11.1018L19.3322 7.51376L12.3862 3.91876C12.2933 3.86965 12.1993 3.82264 12.1042 3.77776L12.0462 3.75376M11.2502 19.7668V12.4048L3.7502 8.73476V15.3588C3.7502 15.5458 3.7502 15.6528 3.7552 15.7338L3.7642 15.8118C3.77714 15.8467 3.79647 15.8789 3.8212 15.9068C3.8262 15.9108 3.8422 15.9238 3.8852 15.9488C3.9532 15.9908 4.0482 16.0388 4.2132 16.1248L11.2502 19.7668Z" />
    </svg>
  );
}

function PenMini() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 17.2501V21.0001H6.75L17.81 9.94006L14.06 6.19006L3 17.2501ZM20.71 7.04006C21.1 6.65006 21.1 6.02006 20.71 5.63006L18.37 3.29006C17.98 2.90006 17.35 2.90006 16.96 3.29006L15.13 5.12006L18.88 8.87006L20.71 7.04006Z" />
    </svg>
  );
}

function CalendarCheckMini() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.53 11.06L15.47 10L10.59 14.88L8.47 12.76L7.41 13.82L10.59 17L16.53 11.06ZM19 3H18V1H16V3H8V1H6V3H5C3.89 3 3.01 3.9 3.01 5L3 19C3 20.1 3.89 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V8H19V19Z" />
    </svg>
  );
}

function CheckMini() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M9.00016 16.1701L4.83016 12.0001L3.41016 13.4101L9.00016 19.0001L21.0002 7.00009L19.5902 5.59009L9.00016 16.1701Z" />
    </svg>
  );
}

function PlusMini() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19 13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
    </svg>
  );
}

function BagMini() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19 6H17C17 3.24 14.76 1 12 1C9.24 1 7 3.24 7 6H5C3.9 6 3.01 6.9 3.01 8L3 20C3 21.1 3.9 22 5 22H19C20.1 22 21 21.1 21 20V8C21 6.9 20.1 6 19 6ZM12 3C13.66 3 15 4.34 15 6H9C9 4.34 10.34 3 12 3Z" />
    </svg>
  );
}

// Plain check (no ring) - matches the growth-diagram check per the designer.
function CheckCircleMini() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M9.00016 16.1701L4.83016 12.0001L3.41016 13.4101L9.00016 19.0001L21.0002 7.00009L19.5902 5.59009L9.00016 16.1701Z" />
    </svg>
  );
}

function BoxMini() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M11.6692 2.28176C11.8872 2.23876 12.1122 2.23876 12.3312 2.28176C12.5822 2.32976 12.8102 2.44876 13.0222 2.55876L13.0752 2.58676L21.3452 6.86676C21.4673 6.93 21.5696 7.02556 21.641 7.14302C21.7124 7.26047 21.7502 7.3953 21.7502 7.53276V15.4308C21.7502 15.7138 21.7522 16.0138 21.6572 16.2928C21.5736 16.5358 21.4389 16.7581 21.2622 16.9448C21.0572 17.1588 20.7892 17.2958 20.5392 17.4248L20.4762 17.4578L12.3452 21.6658C12.2386 21.721 12.1203 21.7498 12.0002 21.7498C11.8801 21.7498 11.7618 21.721 11.6552 21.6658L3.5242 17.4578L3.4612 17.4248C3.2112 17.2958 2.9432 17.1588 2.7382 16.9448C2.5615 16.7581 2.42681 16.5358 2.3432 16.2928C2.2482 16.0128 2.2492 15.7128 2.2502 15.4298V7.53276C2.25019 7.3953 2.28796 7.26047 2.35939 7.14302C2.43081 7.02556 2.53315 6.93 2.6552 6.86676L10.9242 2.58676L10.9772 2.55976C11.1902 2.44876 11.4172 2.32976 11.6692 2.28176ZM11.8952 3.77776C11.8002 3.82264 11.7061 3.86965 11.6132 3.91876L4.6682 7.51376L12.0002 11.1018L19.3322 7.51376L12.3862 3.91876C12.2933 3.86965 12.1993 3.82264 12.1042 3.77776L12.0462 3.75376M11.2502 19.7668V12.4048L3.7502 8.73476V15.3588C3.7502 15.5458 3.7502 15.6528 3.7552 15.7338L3.7642 15.8118C3.77714 15.8467 3.79647 15.8789 3.8212 15.9068C3.8262 15.9108 3.8422 15.9238 3.8852 15.9488C3.9532 15.9908 4.0482 16.0388 4.2132 16.1248L11.2502 19.7668Z" />
    </svg>
  );
}

function TruckMini() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4 8H7V4H21C22.1 4 23 4.9 23 6V17H21C21 18.66 19.66 20 18 20C16.34 20 15 18.66 15 17H9C9 18.66 7.66 20 6 20C4.34 20 3 18.66 3 17H1V12L4 8ZM18 18.5C18.83 18.5 19.5 17.83 19.5 17C19.5 16.17 18.83 15.5 18 15.5C17.17 15.5 16.5 16.17 16.5 17C16.5 17.83 17.17 18.5 18 18.5ZM4.5 9.5L2.54 12H7V9.5H4.5ZM6 18.5C6.83 18.5 7.5 17.83 7.5 17C7.5 16.17 6.83 15.5 6 15.5C5.17 15.5 4.5 16.17 4.5 17C4.5 17.83 5.17 18.5 6 18.5Z" />
    </svg>
  );
}

function WarehouseMini() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22 21V7.67703C22 7.26813 21.751 6.90042 21.3714 6.74856L12.3714 3.14856C12.133 3.05319 11.867 3.05319 11.6286 3.14856L2.62861 6.74856C2.24895 6.90042 2 7.26813 2 7.67703V21H7V12H17V21H22ZM11 19H9V21H11V19ZM13 16H11V18H13V16ZM15 19H13V21H15V19Z" />
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
