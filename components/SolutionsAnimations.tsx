"use client";

import { useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function SolutionsAnimations() {
  useLayoutEffect(() => {
    const section = document.querySelector<HTMLElement>(".solutions-section");
    if (!section) return;

    const cards = gsap.utils.toArray<HTMLElement>(".solution-column", section);
    const media = gsap.matchMedia();
    const context = gsap.context(() => {
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const tweens = cards.map((card, index) =>
          gsap.fromTo(
            card,
            { opacity: 0, y: 100 },
            {
              opacity: 1,
              y: 0,
              duration: 1,
              delay: (index + 1) * 0.1,
              ease: "power4.out",
              scrollTrigger: {
                trigger: card,
                start: "top 95%",
                once: true,
              },
            },
          ),
        );

        const upstreamLayout = document.querySelector<HTMLElement>(".hero-section");
        let refreshFrame: number | undefined;
        const scheduleRefresh = () => {
          if (refreshFrame !== undefined) return;
          refreshFrame = requestAnimationFrame(() => {
            refreshFrame = undefined;
            ScrollTrigger.refresh();
          });
        };
        const resizeObserver = upstreamLayout ? new ResizeObserver(scheduleRefresh) : null;

        if (upstreamLayout) resizeObserver?.observe(upstreamLayout);
        window.addEventListener("load", scheduleRefresh);

        return () => {
          if (refreshFrame !== undefined) cancelAnimationFrame(refreshFrame);
          resizeObserver?.disconnect();
          window.removeEventListener("load", scheduleRefresh);
          tweens.forEach((tween) => tween.kill());
        };
      });

      media.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(cards, { clearProps: "opacity,transform" });
      });
    }, section);

    return () => {
      media.revert();
      context.revert();
    };
  }, []);

  return null;
}
