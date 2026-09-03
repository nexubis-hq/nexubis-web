"use client";

// Laine's intro clip with a custom play button, because native <video controls>
// play buttons can't be styled. The button pulses on load to pull the eye and
// lifts on hover; once the clip is playing we hand off to the native controls
// (scrub, pause, fullscreen). preload="metadata" + the faststart MP4 mean only
// the poster shows until the user actually plays.
import { useRef, useState } from "react";
import { LAINE_VIDEO_SRC, LAINE_VIDEO_SRC_WEBM, LAINE_VIDEO_POSTER } from "./laine-video-config";

export function LaineIntroVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);

  const start = () => {
    setStarted(true);
    void ref.current?.play();
  };

  return (
    <div className="sc-laine-video-wrap">
      <video
        ref={ref}
        controls={started}
        preload="metadata"
        playsInline
        poster={LAINE_VIDEO_POSTER}
        onPlay={() => setStarted(true)}
      >
        <source src={LAINE_VIDEO_SRC_WEBM} type="video/webm" />
        <source src={LAINE_VIDEO_SRC} type="video/mp4" />
      </video>
      {!started ? (
        <button type="button" className="sc-laine-video-play" onClick={start} aria-label="Play Laine's intro">
          <span className="sc-laine-video-play-ring" aria-hidden="true" />
          <svg className="sc-laine-video-play-icon" viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
            <path d="M8 5v14l11-7z" fill="currentColor" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
