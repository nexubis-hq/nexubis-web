"use client";

import { useLayoutEffect } from "react";
import gsap from "gsap";

export function FooterAnimations() {
  useLayoutEffect(() => {
    const footer = document.querySelector<HTMLElement>(".site-footer");
    const wordmark = footer?.querySelector<SVGElement>(".footer-wordmark");
    const photos = footer
      ? gsap.utils.toArray<HTMLImageElement>(".footer-media img", footer)
      : [];

    if (!footer || !wordmark) return;

    const media = gsap.matchMedia();
    const context = gsap.context(() => {
      media.add("(prefers-reduced-motion: no-preference)", () => {
        let wordmarkTween: gsap.core.Tween | undefined;
        const wordmarkObserver = new IntersectionObserver(
          (entries) => {
            if (!entries.some((entry) => entry.isIntersecting)) return;
            wordmarkTween = gsap.from(wordmark, {
              y: "100%",
              opacity: 0,
              duration: 0.8,
              ease: "power2.out",
              clearProps: "all",
            });
            wordmarkObserver.disconnect();
          },
          { rootMargin: "0px 0px -40% 0px", threshold: 0 },
        );
        wordmarkObserver.observe(footer);

        return () => {
          wordmarkTween?.kill();
          wordmarkObserver.disconnect();
        };
      });

      media.add(
        "(prefers-reduced-motion: no-preference) and (min-width: 480px) and (hover: hover) and (pointer: fine)",
        () => {
          const moveX = photos.map((photo) =>
            gsap.quickTo(photo, "x", { duration: 0.3, ease: "power2.out" }),
          );
          const moveY = photos.map((photo) =>
            gsap.quickTo(photo, "y", { duration: 0.3, ease: "power2.out" }),
          );
          const handlePointerMove = (event: PointerEvent) => {
            const xPercent = event.clientX / window.innerWidth - 0.5;
            const yPercent = event.clientY / window.innerHeight - 0.5;

            photos.forEach((photo, index) => {
              moveX[index](xPercent * photo.offsetWidth * 0.1);
              moveY[index](yPercent * photo.offsetHeight * 0.1);
            });
          };

          window.addEventListener("pointermove", handlePointerMove, { passive: true });
          return () => {
            window.removeEventListener("pointermove", handlePointerMove);
            gsap.killTweensOf(photos);
            gsap.set(photos, { clearProps: "transform" });
          };
        },
      );

      media.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set([wordmark, ...photos], { clearProps: "opacity,transform" });
      });
    }, footer);

    return () => {
      media.revert();
      context.revert();
    };
  }, []);

  return null;
}
