// Below-the-fold placeholder for Laine's talking-head intro clip (16:9).
// This section exists ONLY while the clip is missing; once LAINE_VIDEO_SRC
// is set (laine-video-config.ts), the video replaces the radar preview at
// the top of the landing form card and this section renders nothing.
import { LAINE_VIDEO_SRC, LAINE_VIDEO_POSTER as POSTER } from "./laine-video-config";

export function LaineIntroVideo({ title, comingNote }: { title: string; comingNote: string }) {
  if (LAINE_VIDEO_SRC) return null;
  return (
    <section className="sc-laine-video section" aria-label={title}>
      <div className="site-container sc-laine-video-inner">
        <h2 data-reveal>{title}</h2>
        <div className="sc-laine-video-frame" data-reveal>
          <div className="sc-laine-video-coming">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={POSTER} alt="Laine du Toit, Chief Operations Officer at Nexubis" loading="lazy" />
            <span className="sc-laine-video-chip">{comingNote}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
