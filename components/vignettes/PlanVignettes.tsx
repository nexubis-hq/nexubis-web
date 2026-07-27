/**
 * "How it works" process vignettes - one hand-built fake UI per step, matched to
 * the designer's Section 3 mockups (before -> after, plus the motion notes).
 *
 * Hand-built fake UI (only the existing brand avatars, no icon libraries). Each
 * is decorative: wrapped in `data-vignette aria-hidden="true"` so it never enters
 * the copy layer. The static markup renders the resolved "after" state, so under
 * `prefers-reduced-motion` the still image is the finished result. An entrance
 * plays once and a gentle ambient loop layers on top, both keyed off the parent
 * `.plan-card.is-inview` (added by RevealOnScroll).
 *
 * Step 1 - Book an application call: a Google-Meet-style call grid where the
 *          "speaking" glow flips between your team and the client, reactions pop.
 * Step 2 - See it before you commit: a browser before/after, a grey out-of-order
 *          wireframe resolving into the branded, in-order layout with red accents.
 * Step 3 - Our team becomes your team: an org chart that branches out from the
 *          Nexubis mark - the client above, your new creative team below.
 */

import { NexubisLogo } from "@/components/NexubisLogo";

/* ---------- shared glyphs ---------- */

function MicGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" stroke="none" />
      <path d="M6 11a6 6 0 0 0 12 0M12 17v3.5" strokeLinecap="round" />
    </svg>
  );
}

function VideoGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <rect x="3" y="6" width="12" height="12" rx="2.4" />
      <path d="M16.5 10.2 21 7.4v9.2l-4.5-2.8v-3.6Z" />
    </svg>
  );
}

function EmojiGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 14c.9 1.4 2.1 2.1 3.5 2.1s2.6-.7 3.5-2.1" strokeLinecap="round" />
      <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function MoreGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="12" cy="19" r="1.7" />
    </svg>
  );
}

// The designer's rocket, lifted straight from her mockup so it matches exactly.
function RocketGlyph() {
  return (
    <svg viewBox="303 82 154 152" fill="currentColor" fillRule="evenodd" aria-hidden="true">
      <path d="M357.489 119.128C343.164 135.205 333.333 158.303 332.42 160.479L307 149.598L335.44 121.164C338.74 117.865 343.515 116.39 348.15 117.303L357.489 119.128ZM371.393 193.897C371.393 193.897 397.656 183.015 412.753 167.921C450.673 130.01 444.353 100.384 442.317 93.714C435.646 91.6079 406.012 85.3596 368.093 123.271C352.995 138.365 342.111 164.622 342.111 164.622L371.393 193.897ZM416.897 178.522C400.816 192.844 377.713 202.673 375.536 203.586L386.42 229L414.86 200.567C418.161 197.267 419.635 192.493 418.722 187.86L416.897 178.522ZM356.155 200.918C356.155 206.745 353.767 212.01 349.976 215.801C341.689 224.086 307 229 307 229C307 229 311.916 194.318 320.202 186.034C323.994 182.243 329.26 179.856 335.089 179.856C346.745 179.856 356.155 189.264 356.155 200.918ZM384.244 137.733C384.244 130.01 390.563 123.692 398.288 123.692C406.012 123.692 412.332 130.01 412.332 137.733C412.332 145.455 406.012 151.774 398.288 151.774C390.563 151.774 384.244 145.455 384.244 137.733Z" />
    </svg>
  );
}

function HandGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path
        d="M8 11V5.5a1.5 1.5 0 0 1 3 0V10m0-.5V4.5a1.5 1.5 0 0 1 3 0V10m0-.5V6a1.5 1.5 0 0 1 3 0v7.5c0 3.3-2.4 6-5.6 6-1.9 0-3.3-.8-4.4-2.4L5 14.2a1.5 1.5 0 0 1 2.4-1.8L8 13"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ThumbGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13.4 2.6c1.2 0 2 1 1.9 2.2l-.4 3.4h4.4c1.5 0 2.6 1.4 2.2 2.9l-1.9 7c-.3 1.1-1.3 1.9-2.5 1.9H9.5V9.7l3.9-7.1ZM7.5 9.5H4.2c-.9 0-1.7.8-1.7 1.7v7c0 1 .8 1.8 1.7 1.8h3.3V9.5Z" />
    </svg>
  );
}

// The client "company" mark, straight from the designer's export (its own grey
// disc + charcoal building baked in), so it fills the node with no extra circle.
function BuildingGlyph() {
  return (
    <svg viewBox="0 0 85 85" fill="none" aria-hidden="true">
      <rect width="84.2785" height="84.2785" rx="42.1393" fill="#C0C0C0" />
      <path d="M58.6035 33.5065V36.7277V59.2767V62.498H64.5092V33.5065H58.6035Z" fill="#3C3C3A" />
      <path d="M24.2436 62.498V59.2767V36.7277V33.5065H18.3379V62.498H24.2436Z" fill="#3C3C3A" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M55.9173 62.498V20.6213H26.9258V62.498H35.5159V59.2767V48.5391H47.3272V59.2767V62.498H55.9173ZM47.8641 39.4121V43.7072H34.979V39.4121H47.8641ZM47.8641 30.8221V35.1171H34.979V30.8221H47.8641Z"
        fill="#3C3C3A"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M44.1051 51.7603H38.7363V59.2766V62.4979H44.1051V59.2766V51.7603Z"
        fill="#3C3C3A"
      />
    </svg>
  );
}

/* ---------- Step 1: video call grid ---------- */

/**
 * Each tile takes a turn as the speaker. `slot` (1-5) picks its window in the
 * shared loop; the order below lights up non-adjacent tiles so it feels like a
 * real, roaming call - members and the company all get a turn.
 */
const meetTop = [
  { src: "/assets/images/avatar-1.png", slot: 1, live: true },
  { src: "/assets/images/avatar-2.png", slot: 3 },
  { src: "/assets/images/avatar-3.png", slot: 5, react: "thumb" as const },
];
const meetBottom = [
  { src: "/assets/images/avatar-4.png", slot: 2, react: "hand" as const },
  { client: true, slot: 4 },
];

function MeetTile({
  src,
  client,
  slot,
  live,
  react,
}: {
  src?: string;
  client?: boolean;
  slot: number;
  live?: boolean;
  react?: "thumb" | "hand";
}) {
  return (
    <span className={`vm-tile vm-s${slot}${live ? " vm-live" : ""}`}>
      <span className="vm-glow" />
      <span className="vm-wave" />
      {client ? (
        <span className="vm-client">
          <BuildingGlyph />
        </span>
      ) : (
        <span className="vm-av">
          <span
            className="vm-face"
            style={{ backgroundImage: `url(${src})` }}
          />
        </span>
      )}
      {react === "thumb" ? (
        <span className="vm-react vm-react-thumb">
          <ThumbGlyph />
        </span>
      ) : null}
      {react === "hand" ? (
        <span className="vm-react vm-react-hand">
          <HandGlyph />
        </span>
      ) : null}
    </span>
  );
}

/** Step 1 - book a call: a live call grid, the speaking glow flips team <-> client. */
export function PlanCallVignette() {
  return (
    <div className="vg vg-meet" data-vignette aria-hidden="true">
      <div className="vm-grid">
        <div className="vm-row">
          {meetTop.map((t, i) => (
            <MeetTile key={i} {...t} />
          ))}
        </div>
        <div className="vm-row">
          {meetBottom.map((t, i) => (
            <MeetTile key={i} {...t} />
          ))}
        </div>
      </div>
      <div className="vm-bar">
        <span className="vm-ctrl">
          <MicGlyph />
        </span>
        <span className="vm-ctrl">
          <VideoGlyph />
        </span>
        <span className="vm-ctrl">
          <EmojiGlyph />
        </span>
        <span className="vm-ctrl">
          <MoreGlyph />
        </span>
        <span className="vm-ctrl vm-leave">
          <RocketGlyph />
        </span>
      </div>
    </div>
  );
}

/* ---------- Step 2: browser before/after ---------- */

function PreviewPage({ brand = false }: { brand?: boolean }) {
  return (
    <div className={`pv-page${brand ? " pv-brand" : ""}`}>
      <div className="pv-nav">
        <span className="pv-logo" />
        <span className="pv-navlink" />
        <span className="pv-navlink" />
        <span className="pv-navlink" />
        <span className="pv-navcta" />
      </div>
      <div className="pv-body">
        <div className="pv-col">
          <span className="pv-h1" />
          <span className="pv-h2" />
          <div className="pv-lines">
            <span className="pv-p" />
            <span className="pv-p" />
            <span className="pv-p pv-p-sm" />
          </div>
          <span className="pv-btn" />
          <div className="pv-btnrow">
            <span />
            <span />
          </div>
        </div>
        <div className="pv-art">
          {brand ? (
            <>
              <span className="pv-rocket">
                <RocketGlyph />
              </span>
              <span className="pv-card" />
            </>
          ) : (
            <span className="pv-circle" />
          )}
        </div>
      </div>
    </div>
  );
}

/** Step 2 - see it before you commit: a grey wireframe resolves into the branded build. */
export function PlanPreviewVignette() {
  return (
    <div className="vg vg-preview" data-vignette aria-hidden="true">
      <div className="pv-window">
        <div className="pv-bar">
          <span className="pv-dot" />
          <span className="pv-dot" />
          <span className="pv-dot" />
        </div>
        <div className="pv-frame">
          <PreviewPage />
          <PreviewPage brand />
          <span className="pv-split" />
        </div>
      </div>
    </div>
  );
}

/* ---------- Step 3: org chart ---------- */

// Five distinct team members, left to right, each a designer headshot. These
// use their own files (not the call-grid avatars) so restyling the Step 1 call
// never changes the org chart again.
const teamMembers = [
  { src: "/assets/images/avatar-2.png", x: 13, y: 79 },
  { src: "/assets/images/avatar-5.png", x: 31.5, y: 86 },
  { src: "/assets/images/avatar-1.png", x: 50, y: 79 },
  { src: "/assets/images/avatar-blond.png", x: 68.5, y: 86 },
  { src: "/assets/images/avatar-3.png", x: 87, y: 79 },
];

/** Step 3 - our team becomes your team: the Nexubis mark branches into your new team. */
export function PlanSlackVignette() {
  return (
    <div className="vg vg-tree" data-vignette aria-hidden="true">
      <svg
        className="vt-wires"
        viewBox="0 0 160 110"
        fill="none"
        preserveAspectRatio="none"
      >
        <g
          stroke="currentColor"
          strokeWidth="1.1"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        >
          <path className="vt-wire vt-wire-up" pathLength={100} d="M80 26 V34" />
          <path
            className="vt-wire vt-wire-trunk"
            pathLength={100}
            d="M80 57 V68"
          />
          <path
            className="vt-wire vt-wire-bus"
            pathLength={100}
            d="M20.8 68 H139.2"
          />
          <path
            className="vt-wire vt-wire-drops"
            pathLength={100}
            d="M20.8 68 V78 M50.4 68 V85 M80 68 V78 M109.6 68 V85 M139.2 68 V78"
          />
        </g>
      </svg>

      <span className="vt-node vt-client" style={{ left: "50%", top: "13%" }}>
        <BuildingGlyph />
      </span>
      <span className="vt-node vt-hub" style={{ left: "50%", top: "41%" }}>
        <NexubisLogo markOnly />
      </span>
      {teamMembers.map((m, i) => (
        <span
          key={i}
          className="vt-node vt-member"
          style={{ left: `${m.x}%`, top: `${m.y}%`, ["--i" as string]: i }}
        >
          <span className="vm-face" style={{ backgroundImage: `url(${m.src})` }} />
        </span>
      ))}
    </div>
  );
}
