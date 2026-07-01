"use client";

import { useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function HeroAnimations() {
  useLayoutEffect(() => {
    const hero = document.querySelector<HTMLElement>(".hero-section");
    const background = hero?.querySelector<HTMLElement>(".hero-bg-wrap");
    const titleWords = hero?.querySelectorAll<HTMLElement>(".hero-title-word");
    const content = hero?.querySelector<HTMLElement>(".hero-copy");
    const reelRow = hero?.querySelector<HTMLElement>(".hero-reel-row");
    const reel = hero?.querySelector<HTMLElement>(".hero-reel");
    const reelWrap = hero?.querySelector<HTMLElement>(".hero-reel-wrap");
    const reelControl = hero?.querySelector<HTMLButtonElement>(".hero-reel-control");
    const video = hero?.querySelector<HTMLVideoElement>(".hero-reel video");
    const marquee = hero?.querySelector<HTMLElement>(".hero-logos");
    const logoTrack = marquee?.querySelector<HTMLElement>(".hero-logos-track");

    if (
      !hero ||
      !background ||
      !titleWords?.length ||
      !content ||
      !reelRow ||
      !reel ||
      !reelWrap ||
      !reelControl ||
      !video ||
      !marquee ||
      !logoTrack
    ) {
      return;
    }

    const syncVideoControl = () => {
      reelControl.classList.toggle("is-unmuted", !video.muted);
      reelControl.setAttribute("aria-label", video.muted ? "Unmute showreel" : "Mute showreel");
      reelControl.setAttribute("aria-pressed", String(!video.muted));
    };
    const toggleVideoMuted = () => {
      video.muted = !video.muted;
      syncVideoControl();
    };
    const refreshScrollTrigger = () => ScrollTrigger.refresh();

    syncVideoControl();
    reelControl.addEventListener("click", toggleVideoMuted);
    video.addEventListener("volumechange", syncVideoControl);
    video.addEventListener("loadedmetadata", refreshScrollTrigger);

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

        gsap.set(reelRow, { height: reel.offsetHeight });

        let reelTimeline: gsap.core.Timeline | undefined;
        const createReelTimeline = () => {
          if (reelTimeline) return;
          gsap.set(reel, { transformOrigin: "top left", willChange: "transform" });
          gsap.set(reelControl, { transformOrigin: "bottom left", willChange: "transform" });

          reelTimeline = gsap.timeline({
            onUpdate: () => {
              const reelScale = Number(gsap.getProperty(reel, "scaleX")) || 1;
              gsap.set(reelControl, { scale: 1 / reelScale });
            },
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
        };

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

        gsap.set(background, { rotation: 45, scale: 0.01, opacity: 0.075 });
        gsap.set(titleWords, { filter: "blur(10px)", opacity: 0, x: 20, y: 10 });
        gsap.set(content, { y: 100, opacity: 0 });
        gsap.set(reel, { y: 60, opacity: 0 });
        gsap.set(marquee, { y: 30, opacity: 0 });
        hero.classList.remove("hero-intro-pending");

        const introTimeline = gsap.timeline({ onComplete: createReelTimeline });
        introTimeline
          .to(
            background,
            {
              rotation: 0,
              scale: 1,
              opacity: 0.015,
              duration: 1.2,
              ease: "power2.inOut",
              clearProps: "opacity",
            },
            0.5,
          )
          .to(
            titleWords,
            {
              filter: "blur(0px)",
              opacity: 1,
              x: 0,
              y: 0,
              duration: 0.8,
              stagger: 0.1,
              ease: "power2.out",
              clearProps: "filter,opacity,transform",
            },
            1.8,
          )
          .to(
            content,
            { y: 0, opacity: 1, duration: 1, ease: "power2.out", clearProps: "opacity,transform" },
            2.5,
          )
          .to(
            reel,
            { y: 0, opacity: 1, duration: 0.8, ease: "power2.out", clearProps: "opacity,transform" },
            2.8,
          )
          .to(marquee, { y: 0, opacity: 1, duration: 0.8, ease: "power2.out" }, 3.2);

        return () => {
          resizeObserver.disconnect();
          marqueeTween?.kill();
          introTimeline.kill();
          reelTimeline?.kill();
        };
      });

      media.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(
          [background, ...titleWords, content, logoTrack, clone, reel, reelRow, reelWrap, marquee],
          { clearProps: "all" },
        );
        hero.classList.remove("hero-intro-pending");
      });
    }, hero);

    return () => {
      reelControl.removeEventListener("click", toggleVideoMuted);
      video.removeEventListener("volumechange", syncVideoControl);
      video.removeEventListener("loadedmetadata", refreshScrollTrigger);
      media.revert();
      context.revert();
      clone.remove();
    };
  }, []);

  return null;
}
