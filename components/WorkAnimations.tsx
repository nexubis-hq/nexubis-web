"use client";

import { useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function WorkAnimations() {
  useLayoutEffect(() => {
    const section = document.querySelector<HTMLElement>(".work-section");
    const heading = section?.querySelector<HTMLElement>(".section-heading");
    const projects = section?.querySelector<HTMLElement>(".work-tabs");

    if (!section || !heading || !projects) return;

    const media = gsap.matchMedia();
    const context = gsap.context(() => {
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const headingTween = gsap.fromTo(
          heading,
          { y: 100, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 1,
            ease: "power4.out",
            clearProps: "opacity,transform",
            scrollTrigger: {
              trigger: heading,
              start: "top 90%",
              once: true,
            },
          },
        );

        const projectsTween = gsap.fromTo(
          projects,
          { y: 100, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 1,
            delay: 0.1,
            ease: "power4.out",
            clearProps: "opacity,transform",
            scrollTrigger: {
              trigger: projects,
              start: "top 95%",
              once: true,
            },
          },
        );

        return () => {
          headingTween.kill();
          projectsTween.kill();
        };
      });

      media.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set([heading, projects], { clearProps: "opacity,transform" });
      });
    }, section);

    return () => {
      media.revert();
      context.revert();
    };
  }, []);

  return null;
}
