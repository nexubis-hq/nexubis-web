"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Scroll-scrubbed "trade show" closing stage.
 *
 * Progressive enhancement:
 *  - Default (no JS, no video file, or reduced-motion): a single-screen static
 *    booth scene with the copy fully visible and readable. This is the markup
 *    that server-renders, so nothing is ever hidden without JS.
 *  - Enhanced (a usable /booth-loop.mp4 + motion allowed): the section grows
 *    tall, the media pins, and the video's playhead is driven by scroll -
 *    scroll down and the footage plays forward. Once it has scrubbed through,
 *    a soft transparency layer fades in and the copy rises in over the top.
 *
 * The video is never played on its own; we only ever seek `currentTime`, eased
 * toward the scroll target each frame so the scrub feels smooth rather than
 * snapping frame to frame.
 */

const VIDEO_SRC = "/booth-loop.mp4";
const VIDEO_POSTER = "/booth-loop-poster.jpg";

// Fractions of the pinned scroll travel (0 = pinned, 1 = about to unpin).
const SCRUB_END = 0.72; // video finishes playing through here
const REVEAL_START = 0.66; // overlay + copy begin a touch before the last frame
const OVERLAY_MAX = 0.55; // darkest the transparency layer gets

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const smoothstep = (n: number) => n * n * (3 - 2 * n);

export function SuccessStage({
  body,
  children,
}: {
  body: string;
  children: ReactNode;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const video = videoRef.current;
    const inner = innerRef.current;
    const overlay = overlayRef.current;
    if (!section || !video || !inner) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let duration = 0;
    let running = false;
    let raf = 0;
    let target = 0; // scroll-driven target time (s)
    let eased = 0; // current eased playhead (s)

    const setProgress = () => {
      const rect = section.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      const p = travel > 0 ? clamp01(-rect.top / travel) : 0;

      target = clamp01(p / SCRUB_END) * duration;

      const r = smoothstep(clamp01((p - REVEAL_START) / (1 - REVEAL_START)));
      inner.style.setProperty("--reveal", r.toFixed(3));
      // the CTA trails the paragraph in a touch for a staggered settle.
      inner.style.setProperty(
        "--reveal-cta",
        smoothstep(clamp01((r - 0.35) / 0.65)).toFixed(3),
      );
      if (overlay) overlay.style.opacity = (r * OVERLAY_MAX).toFixed(3);
    };

    const frame = () => {
      setProgress();
      // ease the playhead toward the scroll target so scrubbing stays fluid.
      eased += (target - eased) * 0.16;
      if (Math.abs(target - eased) < 0.008) eased = target;
      if (
        video.readyState >= 2 &&
        Math.abs(video.currentTime - eased) > 0.01
      ) {
        try {
          video.currentTime = eased;
        } catch {
          /* seeking not ready yet; retry next frame */
        }
      }
      if (running) raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    const observer = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? start() : stop()),
      { rootMargin: "10% 0px" },
    );

    const enable = () => {
      if (!video.duration || !isFinite(video.duration)) return;
      duration = video.duration;
      // Prime decoding so seeking is reliable (iOS won't seek an unplayed
      // video otherwise). Muted + playsInline makes this play() allowed.
      video.play().then(() => video.pause()).catch(() => {});
      section.classList.add("is-scrub");
      video.classList.add("is-ready");
      observer.observe(section);
    };

    if (video.readyState >= 1 && video.duration) enable();
    else video.addEventListener("loadedmetadata", enable);

    return () => {
      stop();
      observer.disconnect();
      video.removeEventListener("loadedmetadata", enable);
    };
  }, []);

  return (
    <section ref={sectionRef} className="section success-section">
      <div className="success-sticky">
        <div className="success-media" aria-hidden="true">
          <svg
            className="success-booth"
            viewBox="0 0 1200 400"
            preserveAspectRatio="xMidYMax slice"
            fill="none"
          >
            <path className="success-spot" d="M300 -40 L180 400 L520 400 L360 -40 Z" />
            <path className="success-spot" d="M900 -40 L720 400 L1060 400 L840 -40 Z" />
            <rect x="360" y="150" width="480" height="210" rx="6" />
            <rect x="360" y="150" width="480" height="34" rx="6" />
            <path d="M360 250 H840 M600 184 V360" />
            <rect x="250" y="196" width="96" height="164" rx="6" />
            <rect x="854" y="196" width="96" height="164" rx="6" />
            <rect x="520" y="300" width="160" height="60" rx="4" />
          </svg>
          <video
            ref={videoRef}
            className="success-video"
            src={VIDEO_SRC}
            poster={VIDEO_POSTER}
            muted
            playsInline
            preload="auto"
            tabIndex={-1}
          />
          <div ref={overlayRef} className="success-overlay" />
        </div>
        <div className="site-container success-copy">
          <div ref={innerRef} className="success-inner">
            <p className="success-body">{body}</p>
            <div className="btn-group success-actions">{children}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
