"use client";

import { useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type RevealOptions = {
  delay?: number;
  start: string;
  trigger?: HTMLElement;
};

export function SectionScrollAnimations() {
  useLayoutEffect(() => {
    const reviewsSection = document.querySelector<HTMLElement>(".reviews-section");
    const featuredReview = reviewsSection?.querySelector<HTMLElement>(".featured-review");
    const reviewsHeading = reviewsSection?.querySelector<HTMLElement>(".reviews-heading");
    const reviewsRail = reviewsSection?.querySelector<HTMLElement>(".reviews-rail");
    const reviewsPagination = reviewsSection?.querySelector<HTMLElement>(".reviews-pagination");
    const reviewsArrows = reviewsSection?.querySelector<HTMLElement>(".reviews-slider-arrows");

    const uspSection = document.querySelector<HTMLElement>(".usp-section");
    const uspHeading = uspSection?.querySelector<HTMLElement>(".section-heading");
    const comparison = uspSection?.querySelector<HTMLElement>(".comparison-card-wrap");

    const stepsSection = document.querySelector<HTMLElement>(".steps-section");
    const stepsHeading = stepsSection?.querySelector<HTMLElement>(".section-heading");
    const stepsGrid = stepsSection?.querySelector<HTMLElement>(".steps-grid");
    const stepCards = stepsSection
      ? gsap.utils.toArray<HTMLElement>(".step-card", stepsSection)
      : [];

    const faqSection = document.querySelector<HTMLElement>(".faq-section");
    const faqIntro = faqSection?.querySelector<HTMLElement>(".faq-intro");
    const faqList = faqSection?.querySelector<HTMLElement>(".faq-list");

    const targets = [
      featuredReview,
      reviewsHeading,
      reviewsRail,
      reviewsPagination,
      reviewsArrows,
      uspHeading,
      comparison,
      stepsHeading,
      stepsGrid,
      ...stepCards,
      faqIntro,
      faqList,
    ].filter((target): target is HTMLElement => Boolean(target));

    if (!targets.length) return;

    const media = gsap.matchMedia();
    const context = gsap.context(() => {
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const tweens: gsap.core.Tween[] = [];
        const reveal = (
          target: HTMLElement | HTMLElement[],
          { delay = 0, start, trigger }: RevealOptions,
        ) => {
          const tween = gsap.fromTo(
            target,
            { y: 100, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 1,
              delay,
              ease: "power4.out",
              clearProps: "opacity,transform",
              scrollTrigger: {
                trigger: trigger ?? (Array.isArray(target) ? target[0] : target),
                start,
                once: true,
              },
            },
          );
          tweens.push(tween);
        };

        if (featuredReview) reveal(featuredReview, { start: "top 90%" });
        if (reviewsHeading) reveal(reviewsHeading, { start: "top 95%" });
        if (reviewsRail) {
          reveal(
            [reviewsRail, reviewsPagination, reviewsArrows].filter(
              (target): target is HTMLElement => Boolean(target),
            ),
            { start: "top 95%", delay: 0.1, trigger: reviewsRail },
          );
        }

        if (uspHeading) reveal(uspHeading, { start: "top 90%" });
        if (comparison) reveal(comparison, { start: "top 95%", delay: 0.1 });

        if (stepsHeading) reveal(stepsHeading, { start: "top 90%" });
        if (stepsGrid) reveal(stepsGrid, { start: "top 95%", delay: 0.1 });
        stepCards.forEach((card, index) => {
          reveal(card, { start: "top 95%", delay: (index + 1) * 0.1 });
        });

        if (faqIntro) reveal(faqIntro, { start: "top 80%" });
        if (faqList) reveal(faqList, { start: "top 80%", delay: 0.1 });

        return () => tweens.forEach((tween) => tween.kill());
      });

      media.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(targets, { clearProps: "opacity,transform" });
      });
    });

    return () => {
      media.revert();
      context.revert();
    };
  }, []);

  return null;
}
