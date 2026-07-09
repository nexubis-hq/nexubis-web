import type { CSSProperties } from "react";

/**
 * Solutions showcase vignettes - one themed fake-UI illustration per service.
 *
 * All decorative (`data-vignette aria-hidden="true"`), so no copy is added. Entry
 * and idle motion key off the native `.solution-row[open]` state in CSS: a vignette
 * assembles when its accordion row opens and idles while open, then resets when
 * closed. Reduced-motion shows the finished state.
 */

/** Brand identity - a logo lockup snapping onto a grid with colour swatches. */
export function SolBrandVignette() {
  return (
    <div className="sv sv-brand" data-vignette aria-hidden="true">
      <div className="sv-grid" />
      <div className="sv-lockup">
        <span className="sv-mark" />
        <span className="sv-word">
          <span className="sv-word-bar sv-word-bar-lg" />
          <span className="sv-word-bar" />
        </span>
      </div>
      <div className="sv-swatches">
        <span style={{ "--c": "var(--primary)" } as CSSProperties} />
        <span style={{ "--c": "var(--black)" } as CSSProperties} />
        <span style={{ "--c": "var(--mid)" } as CSSProperties} />
        <span style={{ "--c": "var(--light)" } as CSSProperties} />
      </div>
    </div>
  );
}

/** Website - a wireframe assembling into a polished industrial product page. */
export function SolWebsiteVignette() {
  return (
    <div className="sv sv-website" data-vignette aria-hidden="true">
      <div className="sv-window">
        <div className="sv-window-bar">
          <span className="sv-dot" />
          <span className="sv-dot" />
          <span className="sv-dot" />
        </div>
        <div className="sv-page">
          <div className="sv-page-nav">
            <span className="sv-page-mark" />
            <span className="sv-page-navline" />
            <span className="sv-page-navline" />
            <span className="sv-page-navcta" />
          </div>
          <div className="sv-page-hero">
            <div className="sv-page-copy">
              <span className="sv-page-line sv-page-line-lg" />
              <span className="sv-page-line" />
              <span className="sv-page-line sv-page-line-sm" />
              <span className="sv-page-cta" />
            </div>
            <div className="sv-page-media">
              <svg viewBox="0 0 80 60" fill="none">
                <rect x="8" y="14" width="48" height="34" rx="3" />
                <rect x="56" y="24" width="16" height="18" rx="2" />
                <circle cx="22" cy="32" r="6" />
                <circle cx="40" cy="32" r="6" />
              </svg>
            </div>
          </div>
          <div className="sv-page-row">
            <span className="sv-page-tile" />
            <span className="sv-page-tile" />
            <span className="sv-page-tile" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** 3D & CGI - a machine silhouette rotating from wireframe to shaded cutaway. */
export function Sol3DVignette() {
  return (
    <div className="sv sv-3d" data-vignette aria-hidden="true">
      <div className="sv-3d-stage">
        <svg className="sv-3d-machine" viewBox="0 0 120 100" fill="none">
          {/* shaded body */}
          <g className="sv-3d-shade">
            <path d="M20 40 L60 22 L100 40 L100 74 L60 92 L20 74 Z" />
            <path d="M60 22 L60 92" />
            <path d="M20 40 L60 58 L100 40" />
            <circle cx="42" cy="58" r="8" />
            <circle cx="78" cy="58" r="8" />
          </g>
          {/* wireframe overlay */}
          <g className="sv-3d-wire">
            <path d="M20 40 L60 22 L100 40 L100 74 L60 92 L20 74 Z" />
            <path d="M60 22 L60 92 M20 40 L60 58 L100 40 M20 74 L60 58 M100 74 L60 58" />
          </g>
        </svg>
        <span className="sv-3d-grid" />
      </div>
      <span className="sv-3d-chip">
        <span className="sv-3d-chip-dot" />
        Cutaway
      </span>
    </div>
  );
}

/** Video & motion - a filmstrip / scrubber playing a product shot. */
export function SolVideoVignette() {
  return (
    <div className="sv sv-video" data-vignette aria-hidden="true">
      <div className="sv-video-screen">
        <span className="sv-play">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
        <div className="sv-scrubber">
          <span className="sv-progress" />
          <span className="sv-playhead" />
        </div>
      </div>
      <div className="sv-filmstrip">
        <span className="sv-frame" />
        <span className="sv-frame sv-frame-on" />
        <span className="sv-frame" />
        <span className="sv-frame" />
      </div>
    </div>
  );
}

/** Trade show & print - a booth front elevation with a brochure unfolding. */
export function SolTradeshowVignette() {
  return (
    <div className="sv sv-booth" data-vignette aria-hidden="true">
      <div className="sv-booth-structure">
        <span className="sv-booth-sign" />
        <div className="sv-booth-wall">
          <span className="sv-booth-panel" />
          <span className="sv-booth-panel sv-booth-panel-accent" />
          <span className="sv-booth-panel" />
        </div>
        <span className="sv-booth-counter" />
      </div>
      <div className="sv-brochure">
        <span className="sv-bro-panel" />
        <span className="sv-bro-panel sv-bro-panel-mid" />
        <span className="sv-bro-panel" />
      </div>
    </div>
  );
}
