"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./BlogPost.module.css";

type BlogLottiePlayerProps = {
  animationData: unknown;
  fallbackSrc: string | null | undefined;
  title: string;
};

export function BlogLottiePlayer({ animationData, fallbackSrc, title }: BlogLottiePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateReducedMotion = () => setReducedMotion(mediaQuery.matches);

    updateReducedMotion();
    mediaQuery.addEventListener("change", updateReducedMotion);
    return () => mediaQuery.removeEventListener("change", updateReducedMotion);
  }, []);

  useEffect(() => {
    if (reducedMotion || failed || !containerRef.current) return;

    let mounted = true;
    let animation: { destroy: () => void } | null = null;

    import("lottie-web")
      .then((lottie) => {
        if (!mounted || !containerRef.current) return;

        animation = lottie.default.loadAnimation({
          container: containerRef.current,
          renderer: "svg",
          loop: true,
          autoplay: true,
          animationData,
          rendererSettings: {
            preserveAspectRatio: "xMidYMid meet",
          },
        });
      })
      .catch(() => setFailed(true));

    return () => {
      mounted = false;
      animation?.destroy();
    };
  }, [animationData, failed, reducedMotion]);

  if ((failed || reducedMotion) && fallbackSrc) {
    return <img className={styles.heroImage} src={fallbackSrc} alt="" loading="eager" />;
  }

  return (
    <>
      {fallbackSrc ? (
        <img className={styles.heroImage} src={fallbackSrc} alt="" loading="eager" />
      ) : null}
      <div
        ref={containerRef}
        className={styles.lottieCanvas}
        role="img"
        aria-label={`${title} hero animation`}
      />
    </>
  );
}
