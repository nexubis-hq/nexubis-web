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

// The designer's filled rocket, lifted from her mockup (same one used on the
// call-grid "leave" button) so the Published pill matches the brand exactly.
function RocketGlyph() {
  return (
    <svg viewBox="303 82 154 152" fill="currentColor" fillRule="evenodd" aria-hidden="true">
      <path d="M357.489 119.128C343.164 135.205 333.333 158.303 332.42 160.479L307 149.598L335.44 121.164C338.74 117.865 343.515 116.39 348.15 117.303L357.489 119.128ZM371.393 193.897C371.393 193.897 397.656 183.015 412.753 167.921C450.673 130.01 444.353 100.384 442.317 93.714C435.646 91.6079 406.012 85.3596 368.093 123.271C352.995 138.365 342.111 164.622 342.111 164.622L371.393 193.897ZM416.897 178.522C400.816 192.844 377.713 202.673 375.536 203.586L386.42 229L414.86 200.567C418.161 197.267 419.635 192.493 418.722 187.86L416.897 178.522ZM356.155 200.918C356.155 206.745 353.767 212.01 349.976 215.801C341.689 224.086 307 229 307 229C307 229 311.916 194.318 320.202 186.034C323.994 182.243 329.26 179.856 335.089 179.856C346.745 179.856 356.155 189.264 356.155 200.918ZM384.244 137.733C384.244 130.01 390.563 123.692 398.288 123.692C406.012 123.692 412.332 130.01 412.332 137.733C412.332 145.455 406.012 151.774 398.288 151.774C390.563 151.774 384.244 145.455 384.244 137.733Z" />
    </svg>
  );
}

// Filled icon library (official Nexubis exports), shared with the Guide cards.
function CheckGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M9.00016 16.1701L4.83016 12.0001L3.41016 13.4101L9.00016 19.0001L21.0002 7.00009L19.5902 5.59009L9.00016 16.1701Z" />
    </svg>
  );
}

function GlobeGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M11.989 2C6.46902 2 1.99902 6.48 1.99902 12C1.99902 17.52 6.46902 22 11.989 22C17.519 22 21.999 17.52 21.999 12C21.999 6.48 17.519 2 11.989 2ZM18.919 8H15.969C15.649 6.75 15.189 5.55 14.589 4.44C16.429 5.07 17.959 6.35 18.919 8ZM11.999 4.04C12.829 5.24 13.479 6.57 13.909 8H10.089C10.519 6.57 11.169 5.24 11.999 4.04ZM4.25902 14C4.09902 13.36 3.99902 12.69 3.99902 12C3.99902 11.31 4.09902 10.64 4.25902 10H7.63902C7.55902 10.66 7.49902 11.32 7.49902 12C7.49902 12.68 7.55902 13.34 7.63902 14H4.25902ZM5.07902 16H8.02902C8.34902 17.25 8.80902 18.45 9.40902 19.56C7.56902 18.93 6.03902 17.66 5.07902 16ZM8.02902 8H5.07902C6.03902 6.34 7.56902 5.07 9.40902 4.44C8.80902 5.55 8.34902 6.75 8.02902 8ZM11.999 19.96C11.169 18.76 10.519 17.43 10.089 16H13.909C13.479 17.43 12.829 18.76 11.999 19.96ZM14.339 14H9.65902C9.56902 13.34 9.49902 12.68 9.49902 12C9.49902 11.32 9.56902 10.65 9.65902 10H14.339C14.429 10.65 14.499 11.32 14.499 12C14.499 12.68 14.429 13.34 14.339 14ZM14.589 19.56C15.189 18.45 15.649 17.25 15.969 16H18.919C17.959 17.65 16.429 18.93 14.589 19.56ZM16.359 14C16.439 13.34 16.499 12.68 16.499 12C16.499 11.32 16.439 10.66 16.359 10H19.739C19.899 10.64 19.999 11.31 19.999 12C19.999 12.69 19.899 13.36 19.739 14H16.359Z" />
    </svg>
  );
}

function PencilGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 17.2501V21.0001H6.75L17.81 9.94006L14.06 6.19006L3 17.2501ZM20.71 7.04006C21.1 6.65006 21.1 6.02006 20.71 5.63006L18.37 3.29006C17.98 2.90006 17.35 2.90006 16.96 3.29006L15.13 5.12006L18.88 8.87006L20.71 7.04006Z" />
    </svg>
  );
}

function BoxGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M11.6692 2.28176C11.8872 2.23876 12.1122 2.23876 12.3312 2.28176C12.5822 2.32976 12.8102 2.44876 13.0222 2.55876L13.0752 2.58676L21.3452 6.86676C21.4673 6.93 21.5696 7.02556 21.641 7.14302C21.7124 7.26047 21.7502 7.3953 21.7502 7.53276V15.4308C21.7502 15.7138 21.7522 16.0138 21.6572 16.2928C21.5736 16.5358 21.4389 16.7581 21.2622 16.9448C21.0572 17.1588 20.7892 17.2958 20.5392 17.4248L20.4762 17.4578L12.3452 21.6658C12.2386 21.721 12.1203 21.7498 12.0002 21.7498C11.8801 21.7498 11.7618 21.721 11.6552 21.6658L3.5242 17.4578L3.4612 17.4248C3.2112 17.2958 2.9432 17.1588 2.7382 16.9448C2.5615 16.7581 2.42681 16.5358 2.3432 16.2928C2.2482 16.0128 2.2492 15.7128 2.2502 15.4298V7.53276C2.25019 7.3953 2.28796 7.26047 2.35939 7.14302C2.43081 7.02556 2.53315 6.93 2.6552 6.86676L10.9242 2.58676L10.9772 2.55976C11.1902 2.44876 11.4172 2.32976 11.6692 2.28176ZM11.8952 3.77776C11.8002 3.82264 11.7061 3.86965 11.6132 3.91876L4.6682 7.51376L12.0002 11.1018L19.3322 7.51376L12.3862 3.91876C12.2933 3.86965 12.1993 3.82264 12.1042 3.77776L12.0462 3.75376M11.2502 19.7668V12.4048L3.7502 8.73476V15.3588C3.7502 15.5458 3.7502 15.6528 3.7552 15.7338L3.7642 15.8118C3.77714 15.8467 3.79647 15.8789 3.8212 15.9068C3.8262 15.9108 3.8422 15.9238 3.8852 15.9488C3.9532 15.9908 4.0482 16.0388 4.2132 16.1248L11.2502 19.7668Z" />
    </svg>
  );
}

function CalendarGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.53 11.06L15.47 10L10.59 14.88L8.47 12.76L7.41 13.82L10.59 17L16.53 11.06ZM19 3H18V1H16V3H8V1H6V3H5C3.89 3 3.01 3.9 3.01 5L3 19C3 20.1 3.89 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V8H19V19Z" />
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
      <div className="vv-launch-stack">
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
    </div>
  );
}
