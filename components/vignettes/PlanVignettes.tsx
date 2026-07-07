/**
 * "How it works" process vignettes — direct descendants of the old 4-step cards.
 *
 * Hand-built fake UI (no images beyond the existing brand avatars, no icon
 * libraries). Each is decorative: wrapped in `data-vignette aria-hidden="true"`
 * so it never enters the copy layer. Entry animations key off the parent
 * `.plan-card.is-inview` (added by RevealOnScroll); idle loops and hover live in
 * CSS and stop under `prefers-reduced-motion`.
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

/** Step 1 — application call: avatar cluster wired to a booking button. */
export function PlanCallVignette() {
  return (
    <div className="vg vg-call" data-vignette aria-hidden="true">
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
        <span className="vg-av vg-av-cal">
          <CalendarGlyph />
        </span>
      </div>

      <svg className="vg-call-wires" viewBox="0 0 240 54" preserveAspectRatio="none">
        <path d="M40 2 V20 Q40 26 46 26 H114 Q120 26 120 32 V50" />
        <path d="M100 2 V26 H120" />
        <path d="M140 2 V26 H120" />
        <path d="M200 2 V20 Q200 26 194 26 H126 Q120 26 120 32 V50" />
      </svg>

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

/** Step 2 — see it before you commit: a live artboard where brand work paints in. */
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
        <div className="vg-artboard">
          <div className="vg-art-nav">
            <span className="vg-art-mark" />
            <span className="vg-art-navline" />
            <span className="vg-art-navline" />
            <span className="vg-art-navpill" />
          </div>
          <div className="vg-art-hero">
            <div className="vg-art-copy">
              <span className="vg-art-line vg-art-line-lg" />
              <span className="vg-art-line" />
              <span className="vg-art-line vg-art-line-sm" />
              <span className="vg-art-cta" />
            </div>
            <div className="vg-art-machine">
              <svg viewBox="0 0 90 70" fill="none">
                <rect x="10" y="20" width="54" height="38" rx="3" />
                <rect x="64" y="30" width="18" height="22" rx="2" />
                <circle cx="26" cy="39" r="7" />
                <circle cx="48" cy="39" r="7" />
                <path d="M10 58h72" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      <span className="vg-cursor vg-preview-cursor">
        <CursorGlyph />
      </span>
    </div>
  );
}

/** Step 3 — our team becomes your team: Slack list, dedicated channel highlighted. */
export function PlanSlackVignette() {
  return (
    <div className="vg vg-slack" data-vignette aria-hidden="true">
      <div className="vg-slack-panel">
        <div className="vg-slack-head">
          <span className="vg-slack-workspace" />
          <span className="vg-slack-title" />
        </div>
        <div className="vg-slack-group">Channels</div>
        <div className="vg-slack-row">
          <span className="vg-hash">#</span>
          <span className="vg-slack-name" />
        </div>
        <div className="vg-slack-row vg-slack-row-active">
          <span className="vg-hash">#</span>
          <span className="vg-slack-name" />
          <span className="vg-slack-badge">3</span>
        </div>
        <div className="vg-slack-row">
          <span className="vg-hash">#</span>
          <span className="vg-slack-name" />
        </div>
        <div className="vg-slack-row">
          <span className="vg-hash">#</span>
          <span className="vg-slack-name" />
        </div>
      </div>
    </div>
  );
}
