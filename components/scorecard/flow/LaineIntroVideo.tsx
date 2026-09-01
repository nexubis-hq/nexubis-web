// Placeholder for Laine's talking-head intro clip (16:9). The script is
// coming from Leon; until the clip exists, VIDEO_SRC stays empty and the
// component shows the poster frame with a quiet "coming" chip. To go live:
// drop the file in public/assets/videos/, set VIDEO_SRC (and a real POSTER
// frame from the shoot), nothing else changes.
const VIDEO_SRC = "";
const POSTER = "/assets/images/laine-p-500.png";

export function LaineIntroVideo({ title, comingNote }: { title: string; comingNote: string }) {
  return (
    <section className="sc-laine-video section" aria-label={title}>
      <div className="site-container sc-laine-video-inner">
        <h2 data-reveal>{title}</h2>
        <div className="sc-laine-video-frame" data-reveal>
          {VIDEO_SRC ? (
            <video controls preload="metadata" poster={POSTER} src={VIDEO_SRC} />
          ) : (
            <div className="sc-laine-video-coming">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={POSTER} alt="Laine du Toit, Chief Operations Officer at Nexubis" loading="lazy" />
              <span className="sc-laine-video-chip">{comingNote}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
