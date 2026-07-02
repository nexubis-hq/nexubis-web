"use client";

import { useLayoutEffect } from "react";
import gsap from "gsap";

type RevealOptions = {
  delay?: number;
  viewportOffset: 5 | 10 | 20;
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
        const observers: IntersectionObserver[] = [];
        const reveal = (
          target: HTMLElement | HTMLElement[],
          { delay = 0, viewportOffset, trigger }: RevealOptions,
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
              paused: true,
            },
          );
          const triggerElement = trigger ?? (Array.isArray(target) ? target[0] : target);
          const observer = new IntersectionObserver(
            (entries) => {
              if (!entries.some((entry) => entry.isIntersecting)) return;
              tween.play();
              observer.disconnect();
            },
            { rootMargin: `0px 0px -${viewportOffset}% 0px`, threshold: 0 },
          );
          observer.observe(triggerElement);
          tweens.push(tween);
          observers.push(observer);
        };

        if (featuredReview) reveal(featuredReview, { viewportOffset: 10 });
        if (reviewsHeading) reveal(reviewsHeading, { viewportOffset: 5 });
        if (reviewsRail) {
          reveal(
            [reviewsRail, reviewsPagination, reviewsArrows].filter(
              (target): target is HTMLElement => Boolean(target),
            ),
            { viewportOffset: 5, delay: 0.1, trigger: reviewsRail },
          );
        }

        if (uspHeading) reveal(uspHeading, { viewportOffset: 10 });
        if (comparison) reveal(comparison, { viewportOffset: 5, delay: 0.1 });

        if (stepsHeading) reveal(stepsHeading, { viewportOffset: 10 });
        if (stepsGrid) reveal(stepsGrid, { viewportOffset: 5, delay: 0.1 });
        stepCards.forEach((card, index) => {
          reveal(card, { viewportOffset: 5, delay: (index + 1) * 0.1 });
        });

        if (faqIntro) reveal(faqIntro, { viewportOffset: 20 });
        if (faqList) reveal(faqList, { viewportOffset: 20, delay: 0.1 });

        return () => {
          observers.forEach((observer) => observer.disconnect());
          tweens.forEach((tween) => tween.kill());
        };
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
