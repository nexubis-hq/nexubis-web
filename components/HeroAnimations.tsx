"use client";

import { useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function HeroAnimations() {
  useLayoutEffect(() => {
    const hero = document.querySelector<HTMLElement>(".hero-section");
    const reelRow = hero?.querySelector<HTMLElement>(".hero-reel-row");
    const reel = hero?.querySelector<HTMLElement>(".hero-reel");
    const reelWrap = hero?.querySelector<HTMLElement>(".hero-reel-wrap");
    const marquee = hero?.querySelector<HTMLElement>(".hero-logos");
    const logoTrack = marquee?.querySelector<HTMLElement>(".hero-logos-track");

    if (!hero || !reelRow || !reel || !reelWrap || !marquee || !logoTrack) {
      return;
    }

    const clone = logoTrack.cloneNode(true) as HTMLElement;
    clone.classList.add("hero-logos-track-clone");
    clone.setAttribute("aria-hidden", "true");
    clone.querySelectorAll("a").forEach((link) => link.setAttribute("tabindex", "-1"));
    marquee.append(clone);

    const media = gsap.matchMedia();
    const context = gsap.context(() => {
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const initialReelWidth = reel.offsetWidth;
        const finalScale = () => {
          const container = hero.querySelector<HTMLElement>(".hero-inner");
          return container ? container.clientWidth / initialReelWidth : 1;
        };

        gsap.set(reel, { transformOrigin: "top left", willChange: "transform" });
        gsap.set(reelRow, { height: reel.offsetHeight });

        const reelTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: reel,
            start: "top 40%",
            end: "+=300",
            scrub: 0.3,
            invalidateOnRefresh: true,
          },
        });

        reelTimeline
          .to(reel, { scale: finalScale, ease: "power1.inOut" }, 0)
          .to(
            reelWrap,
            {
              padding: 0,
              borderWidth: () => `${1 / finalScale()}px`,
              ease: "power1.inOut",
            },
            0,
          )
          .to(
            reelRow,
            {
              height: () => {
                const container = hero.querySelector<HTMLElement>(".hero-inner");
                return container ? container.clientWidth * (9 / 16) + 2 : reel.offsetHeight;
              },
              ease: "power1.inOut",
            },
            0,
          );

        let marqueeTween: gsap.core.Tween;
        const playMarquee = () => {
          marqueeTween?.kill();
          gsap.set([logoTrack, clone], { x: 0 });
          marqueeTween = gsap.to([logoTrack, clone], {
            x: () => -logoTrack.offsetWidth,
            duration: 60,
            ease: "none",
            repeat: -1,
          });
        };

        playMarquee();
        const resizeObserver = new ResizeObserver(playMarquee);
        resizeObserver.observe(logoTrack);

        return () => {
          resizeObserver.disconnect();
          marqueeTween?.kill();
          reelTimeline.kill();
        };
      });

      media.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set([logoTrack, clone, reel, reelRow, reelWrap], { clearProps: "all" });
      });
    }, hero);

    return () => {
      media.revert();
      context.revert();
      clone.remove();
    };
  }, []);

  return null;
}
