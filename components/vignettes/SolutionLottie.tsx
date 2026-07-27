"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Designer-supplied Lottie for a single "What We Take Off Your Plate" row.
 *
 * Decorative, so the wrapper is aria-hidden to match the hand-built vignettes it
 * replaces. Motion keys off the parent `<details open>` state: the animation
 * plays from the start when its accordion row opens and pauses/rewinds when it
 * closes, so each service assembles on open just like the old SVG vignettes.
 * Reduced-motion holds the finished frame.
 */
export function SolutionLottie({ src }: { src: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const abortController = new AbortController();
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let destroyed = false;
    let animation: import("lottie-web").AnimationItem | undefined;

    // parent accordion row - drives play/pause as it opens and closes.
    const row = container.closest("details");

    const sync = () => {
      if (!animation || reduceMotion) return;
      if (row?.open ?? true) {
        animation.goToAndPlay(0, true);
      } else {
        animation.goToAndStop(0, true);
      }
    };

    setLoaded(false);
    container.replaceChildren();

    Promise.all([
      import("lottie-web"),
      fetch(src, { signal: abortController.signal }).then((response) => {
        if (!response.ok)
          throw new Error(`Unable to load Lottie: ${response.status}`);
        return response.json();
      }),
    ])
      .then(([module, animationData]) => {
        if (destroyed) return;
        const lottie = module.default;
        animation = lottie.loadAnimation({
          container,
          renderer: "svg",
          loop: !reduceMotion,
          autoplay: false,
          animationData,
          rendererSettings: { progressiveLoad: true },
        });
        animation.addEventListener("DOMLoaded", () => {
          setLoaded(true);
          if (reduceMotion) {
            animation?.goToAndStop(animation.totalFrames - 1, true);
          } else {
            sync();
          }
        });
      })
      .catch((error: unknown) => {
        if (!abortController.signal.aborted) console.error(error);
      });

    row?.addEventListener("toggle", sync);

    return () => {
      destroyed = true;
      abortController.abort();
      row?.removeEventListener("toggle", sync);
      animation?.destroy();
    };
  }, [src]);

  return (
    <div
      className={`sv-lottie${loaded ? " is-loaded" : ""}`}
      data-vignette
      aria-hidden="true"
      ref={containerRef}
    />
  );
}
