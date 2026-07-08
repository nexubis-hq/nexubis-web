/**
 * "How it works" process vignettes - direct descendants of the old 4-step cards.
 *
 * Hand-built fake UI (no images beyond the existing brand avatars, no icon
 * libraries). Each is decorative: wrapped in `data-vignette aria-hidden="true"`
 * so it never enters the copy layer. Looping motion keys off the parent
 * `.plan-card.is-inview` (added by RevealOnScroll) and stops under
 * `prefers-reduced-motion`, where the static baseline is the finished state.
 */

function CalendarGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" strokeLinecap="round" />
      <rect x="7" y="12.5" width="3.2" height="3" rx="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ArrowGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CursorGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M5 3l6.5 15.5 2-6 6-2L5 3z" />
    </svg>
  );
}

function HandleGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M9 8l-4 4 4 4M15 8l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WebsiteGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <path d="M3.5 9h17M7.5 6.8h.01" strokeLinecap="round" />
    </svg>
  );
}

function BrandGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        d="M12.5 3.5 20.5 11.5a2 2 0 0 1 0 2.8l-6.2 6.2a2 2 0 0 1-2.8 0L3.5 12.5v-7a2 2 0 0 1 2-2h7Z"
        strokeLinejoin="round"
      />
      <circle cx="8.2" cy="8.2" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

function CubeGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3ZM4 7.5l8 4.5 8-4.5M12 12v9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function VideoGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
      <path d="M10.5 9.5l4.5 2.5-4.5 2.5v-5Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function PrintGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 8V4h10v4M7 17H4.5v-6a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v6H17" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="7" y="14.5" width="10" height="5.5" rx="1" />
    </svg>
  );
}

/** Step 1 - application call: the team plus a calendar, one button to press. */
export function PlanCallVignette() {
  return (
    <div className="vg vg-call" data-vignette aria-hidden="true">
      <div className="vg-call-row">
        <div className="vg-call-avatars">
          <span
            className="vg-av"
            style={{ backgroundImage: "url(/assets/images/avatar-1.png)" }}
          />
          <span
            className="vg-av"
            style={{ backgroundImage: "url(/assets/images/avatar-4.png)" }}
          />
          <span
            className="vg-av"
            style={{ backgroundImage: "url(/assets/images/avatar-2.png)" }}
          />
        </div>
        <svg className="vg-call-link" viewBox="0 0 48 16" fill="none" stroke="currentColor">
          <path className="vg-link-dash" d="M2 8h34" strokeWidth="2" strokeLinecap="round" strokeDasharray="5 5" />
          <path d="M36 3l8 5-8 5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="vg-av-cal">
          <CalendarGlyph />
          <span className="vg-av-cal-ring" />
        </span>
      </div>

      <div className="vg-call-btn">
        <span>Book a call</span>
        <span className="vg-call-btn-arrow">
          <ArrowGlyph />
        </span>
      </div>

      <span className="vg-cursor vg-call-cursor">
        <CursorGlyph />
      </span>
    </div>
  );
}

/** Step 2 - see it before you commit: a before/after slider sweeps wireframe into brand. */
export function PlanPreviewVignette() {
  return (
    <div className="vg vg-preview" data-vignette aria-hidden="true">
      <div className="vg-window">
        <div className="vg-window-bar">
          <span className="vg-dot" />
          <span className="vg-dot" />
          <span className="vg-dot" />
          <span className="vg-window-tab" />
        </div>
        <div className="vg-compare">
          <div className="vg-layer vg-wire">
            <div className="vg-layer-nav">
              <span className="vg-layer-mark" />
              <span className="vg-layer-navline" />
              <span className="vg-layer-navline" />
              <span className="vg-layer-pill" />
            </div>
            <div className="vg-layer-hero">
              <div className="vg-layer-copy">
                <span className="vg-layer-line vg-layer-line-lg" />
                <span className="vg-layer-line" />
                <span className="vg-layer-line vg-layer-line-sm" />
                <span className="vg-layer-cta" />
              </div>
              <div className="vg-layer-art" />
            </div>
          </div>
          <div className="vg-layer vg-brand">
            <div className="vg-layer-nav">
              <span className="vg-layer-mark" />
              <span className="vg-layer-navline" />
              <span className="vg-layer-navline" />
              <span className="vg-layer-pill" />
            </div>
            <div className="vg-layer-hero">
              <div className="vg-layer-copy">
                <span className="vg-layer-line vg-layer-line-lg" />
                <span className="vg-layer-line" />
                <span className="vg-layer-line vg-layer-line-sm" />
                <span className="vg-layer-cta" />
              </div>
              <div className="vg-layer-art">
                <span className="vg-vase" />
              </div>
            </div>
          </div>
          <span className="vg-divider">
            <span className="vg-divider-handle">
              <HandleGlyph />
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

const planChannels = [
  WebsiteGlyph,
  BrandGlyph,
  CubeGlyph,
  VideoGlyph,
  PrintGlyph,
];

/** Step 3 - our team becomes your team: every channel covered, highlight sweeps the list. */
export function PlanSlackVignette() {
  return (
    <div className="vg vg-channels" data-vignette aria-hidden="true">
      <div className="vg-chan-panel">
        <div className="vg-chan-head">
          <span className="vg-chan-mark" />
          <span className="vg-chan-title" />
          <div className="vg-chan-avatars">
            <span style={{ backgroundImage: "url(/assets/images/avatar-1.png)" }} />
            <span style={{ backgroundImage: "url(/assets/images/avatar-4.png)" }} />
            <span style={{ backgroundImage: "url(/assets/images/avatar-2.png)" }} />
          </div>
        </div>
        <div className="vg-chan-label">Channels</div>
        {planChannels.map((Glyph, index) => (
          <div
            className={`vg-chan-row${index === 2 ? " vg-chan-row-active" : ""}`}
            key={index}
          >
            <span className="vg-chan-icon">
              <Glyph />
            </span>
            <span className="vg-chan-name" />
            <span className="vg-chan-thumb" />
            <span className="vg-chan-check" />
          </div>
        ))}
      </div>
    </div>
  );
}
