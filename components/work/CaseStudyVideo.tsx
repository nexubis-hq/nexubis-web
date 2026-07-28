"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { CaseStudyVideo as CaseStudyVideoData } from "@/lib/work/types";

gsap.registerPlugin(ScrollTrigger);

type CaseStudyVideoProps = {
  video: CaseStudyVideoData;
  className?: string;
  isHero?: boolean;
};

export function CaseStudyVideo({ video, className, isHero = false }: CaseStudyVideoProps) {
  const reelRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const controlRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = muted;
    }
  }, [muted]);

  useLayoutEffect(() => {
    if (!isHero || !reelRef.current || !wrapRef.current || !controlRef.current || !videoRef.current) {
      return;
    }

    const hero = reelRef.current.closest<HTMLElement>(".case-study-hero");
    const row = reelRef.current.closest<HTMLElement>(".case-study-hero-reel-row");
    if (!hero || !row) return;

    const reel = reelRef.current;
    const wrap = wrapRef.current;
    const control = controlRef.current;
    const videoElement = videoRef.current;
    const media = gsap.matchMedia();
    const refreshScrollTrigger = () => ScrollTrigger.refresh();

    videoElement.addEventListener("loadedmetadata", refreshScrollTrigger);
    videoElement.addEventListener("loadeddata", refreshScrollTrigger);

    const context = gsap.context(() => {
      media.add("(prefers-reduced-motion: no-preference) and (min-width: 768px)", () => {
        const initialWidth = () => {
          const currentScale = Number(gsap.getProperty(reel, "scaleX")) || 1;
          return reel.offsetWidth / currentScale;
        };
        const finalScale = () => {
          const width = initialWidth();
          return width ? hero.querySelector<HTMLElement>(".case-study-hero-inner")!.clientWidth / width : 1;
        };

        gsap.set(row, { height: reel.offsetHeight });
        gsap.set(reel, { y: 60, opacity: 0, transformOrigin: "top left", willChange: "transform" });
        gsap.set(control, { transformOrigin: "bottom left", willChange: "transform" });

        const intro = gsap.to(reel, {
          y: 0,
          opacity: 1,
          duration: 1,
          ease: "power2.out",
          delay: 0.3,
        });

        const grow = gsap.timeline({
          scrollTrigger: {
            trigger: reel,
            start: "top 40%",
            end: "+=300",
            scrub: 0.3,
            invalidateOnRefresh: true,
          },
          onUpdate: () => {
            const scale = Number(gsap.getProperty(reel, "scaleX")) || 1;
            gsap.set(control, { scale: 1 / scale });
          },
        });

        grow
          .to(reel, { scale: finalScale, ease: "power1.inOut" }, 0)
          .to(wrap, { padding: 0, borderWidth: () => `${1 / finalScale()}px`, ease: "power1.inOut" }, 0)
          .to(
            row,
            {
              height: () => hero.querySelector<HTMLElement>(".case-study-hero-inner")!.clientWidth * (9 / 16) + 2,
              ease: "power1.inOut",
            },
            0,
          );

        return () => {
          intro.kill();
          grow.kill();
        };
      });

      media.add("(prefers-reduced-motion: reduce), (max-width: 767px)", () => {
        gsap.set([row, reel, wrap, control], { clearProps: "all" });
      });
    }, hero);

    return () => {
      videoElement.removeEventListener("loadedmetadata", refreshScrollTrigger);
      videoElement.removeEventListener("loadeddata", refreshScrollTrigger);
      media.revert();
      context.revert();
    };
  }, [isHero]);

  const toggleMuted = () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    if (!nextMuted) {
      void videoRef.current?.play?.().catch(() => {});
    }
  };

  return (
    <div ref={reelRef} className={className}>
      <div ref={wrapRef} className="case-study-video-wrap">
        <div className="case-study-video-inner">
          {isHero ? (
            <button
              ref={controlRef}
              className={`case-study-video-control${muted ? "" : " is-unmuted"}`}
              type="button"
              aria-label={muted ? "Unmute video" : "Mute video"}
              aria-pressed={!muted}
              onClick={toggleMuted}
            >
              <UnmuteIcon />
              <MuteIcon />
            </button>
          ) : null}
          <video ref={videoRef} title={video.title} playsInline autoPlay muted loop controls={false} poster={video.poster}>
            <source src={video.src} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      </div>
    </div>
  );
}

function UnmuteIcon() {
  return (
    <svg className="case-study-video-icon case-study-video-unmute" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" fill="none" aria-hidden="true">
      <path d="M14 3.23V20.77C14 21.47 13.18 21.85 12.65 21.39L7.39 16.8H4.53C3.69 16.8 3 16.11 3 15.27V8.73C3 7.89 3.69 7.2 4.53 7.2H7.39L12.65 2.61C13.18 2.15 14 2.53 14 3.23Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M17 8.5C18.06 9.44 18.67 10.76 18.67 12C18.67 13.24 18.06 14.56 17 15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M19.5 5.5C21.1 7.17 22 9.48 22 12C22 14.52 21.1 16.83 19.5 18.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function MuteIcon() {
  return (
    <svg className="case-study-video-icon case-study-video-mute" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" fill="none" aria-hidden="true">
      <path d="M14 3.23V20.77C14 21.47 13.18 21.85 12.65 21.39L7.39 16.8H4.53C3.69 16.8 3 16.11 3 15.27V8.73C3 7.89 3.69 7.2 4.53 7.2H7.39L12.65 2.61C13.18 2.15 14 2.53 14 3.23Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M19.5 9.5L16.5 12.5M16.5 9.5L19.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
