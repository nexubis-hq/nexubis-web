"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";

type OxipackProofVideoProps = {
  src: string;
  poster: string;
  title: string;
};

const frameStyle: CSSProperties = {
  position: "relative",
  display: "block",
  width: "100%",
  aspectRatio: "16 / 9",
  borderRadius: "12px",
  overflow: "hidden",
  background: "var(--white)",
};

const mediaStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  display: "block",
  objectFit: "contain",
  objectPosition: "center",
};

const overlayStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 2,
  display: "grid",
  placeItems: "center",
  pointerEvents: "none",
};

const buttonStyle: CSSProperties = {
  width: "4rem",
  height: "4rem",
  pointerEvents: "auto",
};

export function OxipackProofVideo({ src, poster, title }: OxipackProofVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.playsInline = true;

    const handlePause = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);
    const handleLoadedMetadata = () => {
      if (!isPlaying && video.currentTime < 1) {
        video.currentTime = 1.5;
      }
    };
    const handleEnded = () => {
      video.currentTime = 0;
      setIsPlaying(false);
    };
    const handleError = () => {
      setHasError(true);
      setIsPlaying(false);
      if (process.env.NODE_ENV !== "production") {
        console.error("Homepage Oxipack showreel failed to load.", {
          src,
          code: video.error?.code,
          message: video.error?.message,
        });
      }
    };

    video.addEventListener("pause", handlePause);
    video.addEventListener("play", handlePlay);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("error", handleError);
    if (video.readyState >= 1) {
      handleLoadedMetadata();
    }

    return () => {
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("error", handleError);
    };
  }, [isPlaying, src]);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video || hasError) return;

    if (video.paused || video.ended) {
      // Clicking play is a user gesture, so we can start with sound on.
      video.muted = false;
      void video
        .play()
        .then(() => setIsPlaying(true))
        .catch((error: unknown) => {
          setIsPlaying(false);
          if (process.env.NODE_ENV !== "production") {
            console.warn("Homepage Oxipack showreel playback was deferred.", { src, error });
          }
        });
      return;
    }

    video.pause();
  };

  return (
    <div className={`proof-video${isPlaying ? " is-playing" : ""}${hasError ? " has-error" : ""}`} style={frameStyle}>
      <Image
        className="proof-video-poster"
        src={poster}
        alt=""
        width={1920}
        height={1080}
        aria-hidden="true"
        style={{ ...mediaStyle, zIndex: 0 }}
      />
      <video
        ref={videoRef}
        title={title}
        muted
        playsInline
        preload="metadata"
        poster={poster}
        controls={isPlaying}
        style={{ ...mediaStyle, zIndex: 1 }}
      >
        <source src={src} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div className="proof-video-overlay" style={{ ...overlayStyle, opacity: isPlaying ? 0 : 1 }}>
        <button
          className="proof-video-play"
          type="button"
          aria-label={isPlaying ? "Pause Oxipack showreel" : "Play Oxipack showreel"}
          aria-pressed={isPlaying}
          onClick={togglePlayback}
          style={{ ...buttonStyle, pointerEvents: isPlaying ? "none" : "auto" }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
