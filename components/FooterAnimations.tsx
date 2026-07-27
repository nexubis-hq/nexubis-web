"use client";

import { useEffect } from "react";

/**
 * Scroll-linked footer wordmark. As the footer scrolls into view the giant
 * "nexubis" rises up from behind the (opaque) nav block, its playhead tied to
 * scroll position for a smooth, sleek reveal rather than a one-shot pop.
 * Under reduced motion it just rests in its finished position.
 */

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const smoothstep = (n: number) => n * n * (3 - 2 * n);

export function FooterAnimations() {
  useEffect(() => {
    const footer = document.querySelector<HTMLElement>(".site-footer");
    const wordmark = footer?.querySelector<HTMLElement>(".footer-wordmark");
    if (!footer || !wordmark) return;

    // On phones the wordmark is small and the "rise from behind the nav" effect
    // reads as broken, so (like reduced motion) it just rests in place.
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      window.matchMedia("(max-width: 767px)").matches
    ) {
      wordmark.style.transform = "none";
      wordmark.style.opacity = "1";
      return;
    }

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = footer.getBoundingClientRect();
      const vh = window.innerHeight;
      // Begin as the footer's top edge nears the bottom of the viewport, finish
      // once it has travelled up to ~30% - a comfortable reveal window.
      const start = vh * 0.95;
      const end = vh * 0.3;
      const eased = smoothstep(clamp01((start - rect.top) / (start - end)));
      wordmark.style.transform = `translate3d(0, ${((1 - eased) * 100).toFixed(2)}%, 0)`;
      wordmark.style.opacity = eased.toFixed(3);
    };
    const request = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    return () => {
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", request);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
