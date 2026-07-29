"use client";

import { useRef } from "react";

const ABSTRACT_START = 27.4;
const ABSTRACT_END = 30.2;

export function AboutReel() {
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <video
      ref={videoRef}
      playsInline
      autoPlay
      muted
      loop
      preload="metadata"
      poster="/assets/images/about-reel-poster.png"
      onLoadedMetadata={() => {
        if (videoRef.current) {
          videoRef.current.currentTime = ABSTRACT_START;
        }
      }}
      onTimeUpdate={() => {
        const video = videoRef.current;
        if (!video) return;

        if (video.currentTime < ABSTRACT_START || video.currentTime >= ABSTRACT_END) {
          video.currentTime = ABSTRACT_START;
          void video.play();
        }
      }}
    >
      <source
        src="https://pub-d0adc0fc26c84d8e8c8db97d1ab2d30f.r2.dev/nexubis/reel.mp4#t=27.4"
        type="video/mp4"
      />
      Your browser does not support the video tag.
    </video>
  );
}
