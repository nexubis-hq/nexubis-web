"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { CaseStudyVideo as CaseStudyVideoData } from "@/lib/work/types";
import { ShowreelMuteButton } from "@/components/ShowreelMuteButton";

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

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    let hasLoggedError = false;
    videoElement.loop = true;
    videoElement.autoplay = true;
    videoElement.muted = muted;
    videoElement.playsInline = true;

    const attemptPlayback = () => {
      if (document.visibilityState === "hidden" || videoElement.error) return;
      void videoElement.play().catch((error: unknown) => {
        if (process.env.NODE_ENV !== "production" && !hasLoggedError) {
          hasLoggedError = true;
          console.warn("Case study video playback was deferred.", { src: video.src, error });
        }
      });
    };

    const handleEnded = () => {
      videoElement.currentTime = 0;
      attemptPlayback();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") attemptPlayback();
    };
    const handleError = () => {
      if (process.env.NODE_ENV !== "production" && !hasLoggedError) {
        hasLoggedError = true;
        console.error("Case study video failed to load.", {
          src: video.src,
          code: videoElement.error?.code,
          message: videoElement.error?.message,
        });
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) attemptPlayback();
      },
      { threshold: 0.05 },
    );

    videoElement.addEventListener("loadedmetadata", attemptPlayback);
    videoElement.addEventListener("canplay", attemptPlayback);
    videoElement.addEventListener("ended", handleEnded);
    videoElement.addEventListener("error", handleError);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    observer.observe(videoElement);
    attemptPlayback();

    return () => {
      videoElement.removeEventListener("loadedmetadata", attemptPlayback);
      videoElement.removeEventListener("canplay", attemptPlayback);
      videoElement.removeEventListener("ended", handleEnded);
      videoElement.removeEventListener("error", handleError);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      observer.disconnect();
    };
  }, [muted, video.src]);

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
            <ShowreelMuteButton
              ref={controlRef}
              className="case-study-video-control"
              isUnmuted={!muted}
              aria-label={muted ? "Unmute showreel" : "Mute showreel"}
              aria-pressed={!muted}
              onClick={toggleMuted}
            />
          ) : null}
          <video ref={videoRef} title={video.title} playsInline autoPlay muted loop preload="metadata" controls={false} poster={video.poster}>
            <source src={video.src} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      </div>
    </div>
  );
}
