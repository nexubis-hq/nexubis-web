"use client";

import { useEffect, useRef, useState } from "react";

const DESKTOP_PATH = "/assets/lotties/CompetitorComparison.json";
const MOBILE_PATH = "/assets/lotties/CompetitorComparison_Mobile.json";

export function CompetitorComparisonLottie() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mobile, setMobile] = useState<boolean | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 479px)");
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mobile === null) return;

    const abortController = new AbortController();
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let destroyed = false;
    let animation: import("lottie-web").AnimationItem | undefined;

    setLoaded(false);
    container.replaceChildren();

    Promise.all([
      import("lottie-web"),
      fetch(mobile ? MOBILE_PATH : DESKTOP_PATH, {
        signal: abortController.signal,
      }).then((response) => {
        if (!response.ok) throw new Error(`Unable to load Lottie: ${response.status}`);
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
          autoplay: !reduceMotion,
          animationData,
          rendererSettings: { progressiveLoad: true },
        });
        animation.addEventListener("DOMLoaded", () => {
          if (reduceMotion) animation?.goToAndStop(215, true);
          setLoaded(true);
        });
      })
      .catch((error: unknown) => {
        if (!abortController.signal.aborted) console.error(error);
      });

    return () => {
      destroyed = true;
      abortController.abort();
      animation?.destroy();
    };
  }, [mobile]);

  return (
    <div
      className={
        mobile === true
          ? "competitor-lottie competitor-lottie-mobile"
          : "competitor-lottie competitor-lottie-desktop"
      }
      role="img"
      aria-label="Cost and team comparison between an in-house team and Nexubis"
    >
      {mobile !== true && !loaded && (
        <img
          className="competitor-lottie-fallback"
          src="/assets/images/competitor-comparison-static.png"
          alt=""
        />
      )}
      <div className="competitor-lottie-canvas" ref={containerRef} />
    </div>
  );
}
