"use client";

import { useLayoutEffect } from "react";
import gsap from "gsap";

/**
 * Generic scroll reveal for the rebuilt homepage sections.
 *
 * Any element with a `data-reveal` attribute fades and lifts into place the first
 * time it enters the viewport. Add `data-reveal-delay` (seconds) to stagger tiles
 * and cards. Motion matches the existing sections: a short lift, power4 ease, and
 * a full respect for reduced-motion (elements simply appear).
 *
 * This decouples motion from section markup, so restructured sections keep their
 * animation as long as they carry the `data-reveal` hook.
 *
 * On reveal, the element also gets an `is-inview` class. Vignettes hang their
 * internal "assemble" animations off `.is-inview` in CSS, so a fake-UI vignette
 * only builds itself once its card has scrolled into view (not while hidden).
 * Under reduced-motion the class is applied immediately so those final states show.
 */
export function RevealOnScroll() {
  useLayoutEffect(() => {
    const elements = gsap.utils.toArray<HTMLElement>("[data-reveal]");
    if (!elements.length) return;

    const media = gsap.matchMedia();
    const context = gsap.context(() => {
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const observers: IntersectionObserver[] = [];
        const tweens = elements.map((element) => {
          const delay = Number(element.dataset.revealDelay) || 0;
          const tween = gsap.fromTo(
            element,
            { y: 40, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 1,
              delay,
              ease: "power4.out",
              clearProps: "opacity,transform",
              paused: true,
            },
          );

          const observer = new IntersectionObserver(
            (entries) => {
              if (!entries.some((entry) => entry.isIntersecting)) return;
              tween.play();
              element.classList.add("is-inview");
              observer.disconnect();
            },
            { rootMargin: "0px 0px -10% 0px", threshold: 0 },
          );
          observer.observe(element);
          observers.push(observer);
          return tween;
        });

        return () => {
          observers.forEach((observer) => observer.disconnect());
          tweens.forEach((tween) => tween.kill());
        };
      });

      media.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(elements, { clearProps: "opacity,transform" });
        elements.forEach((element) => element.classList.add("is-inview"));
      });
    });

    return () => {
      media.revert();
      context.revert();
    };
  }, []);

  return null;
}
