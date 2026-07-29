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
        src="https://pub-d0adc0fc26c84d8e8c8db97d1ab2d30f.r2.dev/nexubis/reel.mp4"
        type="video/mp4"
      />
      Your browser does not support the video tag.
    </video>
  );
}
