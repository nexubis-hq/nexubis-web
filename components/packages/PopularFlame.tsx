"use client";

// The animated flame in the "Most chosen" pill, same Lottie the site has always
// used for the popular badge. Loads lottie-web lazily and shows the static flame
// as a fallback until it is ready, or permanently when reduced motion is on.
// Reuses the existing .package-lottie-icon / .popular-icon styling.

import { useEffect, useRef, useState } from "react";

function FlameFallback() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13.6 2.5c.4 3.1-1.3 4.5-2.7 5.8-1.2 1.1-2.2 2.1-2.2 3.8 0 1.2.7 2.2 1.7 2.8-.1-1.7.8-3 2.1-4.2.1 2 1.8 2.9 2.5 4.5.8 1.8.1 4-1.5 5.1 3.9-.7 6.3-3.5 6.3-7.2 0-4.4-3.2-8.1-6.2-10.6Z" />
      <path opacity=".4" d="M7.8 7.8C5.6 9.7 4.2 12 4.2 15a6.8 6.8 0 0 0 6.8 6.8c.9 0 1.8-.2 2.5-.5-3.5-.2-6.1-2.8-6.1-6.2 0-2.5 1.8-4.2.4-7.3Z" />
    </svg>
  );
}

export function PopularFlame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!container || reduceMotion) return;

    let animation: import("lottie-web").AnimationItem | undefined;
    let cancelled = false;

    import("lottie-web").then((module) => {
      if (cancelled || !container) return;
      animation = module.default.loadAnimation({
        autoplay: true,
        container,
        loop: true,
        path: "/assets/lotties/PackagePopularFlame.json",
        renderer: "svg",
      });
      animation.addEventListener("DOMLoaded", () => setLoaded(true));
    });

    return () => {
      cancelled = true;
      animation?.destroy();
    };
  }, []);

  return (
    <span className="package-lottie-icon popular-icon" aria-hidden="true">
      <span className={loaded ? "package-lottie-fallback package-lottie-fallback-hidden" : "package-lottie-fallback"}>
        <FlameFallback />
      </span>
      <span className="package-lottie-canvas" ref={containerRef} />
    </span>
  );
}