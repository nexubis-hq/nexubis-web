import { NEXUBIS_SHOWREEL_URL } from "@/lib/site-config";

export function AboutReel() {
  return (
    <video
      playsInline
      autoPlay
      muted
      loop
      preload="metadata"
      poster="/assets/images/about-reel-poster.jpg"
    >
      <source
        src={NEXUBIS_SHOWREEL_URL}
        type="video/mp4"
      />
      Your browser does not support the video tag.
    </video>
  );
}
