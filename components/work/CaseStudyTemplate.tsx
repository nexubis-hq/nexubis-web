import Image from "next/image";
import Link from "next/link";
import type { CaseStudy, CaseStudyVideo } from "@/lib/work/types";
import { getAllCaseStudies, getRelatedCaseStudies } from "@/lib/work/data";

type CaseStudyTemplateProps = {
  caseStudy: CaseStudy;
};

export function CaseStudyTemplate({ caseStudy }: CaseStudyTemplateProps) {
  const relatedStudies = getRelatedCaseStudies(caseStudy.relatedSlugs);
  const caseStudyNav = getAllCaseStudies();

  return (
    <main className="case-study-page">
      <section className="case-study-hero">
        <div className="site-container case-study-hero-inner">
          <div className="case-study-breadcrumb">Case Studies</div>
          <nav className="case-study-nav" aria-label="Case studies">
            {caseStudyNav.map((item) => (
              <Link
                key={item.slug}
                href={`/work/${item.slug}`}
                aria-current={item.slug === caseStudy.slug ? "page" : undefined}
              >
                {item.title.split(" ")[0]}
              </Link>
            ))}
          </nav>
          <div className="case-study-hero-grid">
            <div>
              <h1>{caseStudy.title}</h1>
            </div>
            <ul className="case-study-tags" aria-label="Services">
              {caseStudy.services.map((service) => (
                <li key={service}>{service}</li>
              ))}
            </ul>
          </div>
          <CaseStudyVideoBlock video={caseStudy.heroVideo} className="case-study-hero-video" />
        </div>
      </section>

      <section className="case-study-content">
        <div className="site-container case-study-content-grid">
          <aside className="case-study-sidebar" aria-label="Project summary">
            <CaseStudySummary title={caseStudy.problem.title} body={caseStudy.problem.body} />
            <CaseStudySummary title={caseStudy.solution.title} body={caseStudy.solution.body} />
            {caseStudy.links.length ? (
              <div className="case-study-summary">
                <h2>Links</h2>
                <ul className="case-study-link-list">
                  {caseStudy.links.map((link) => (
                    <li key={link.href}>
                      <a href={link.href} target="_blank" rel="noreferrer">
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </aside>

          <div className="case-study-gallery" aria-label={`${caseStudy.title} media`}>
            {(caseStudy.galleryImages.length ? caseStudy.galleryImages : [caseStudy.coverImage]).map((image, index) => (
              <Image
                key={image.src}
                className={`case-study-gallery-image case-study-gallery-image-${index + 1}`}
                src={image.src}
                alt={image.alt}
                width={image.width}
                height={image.height}
                sizes="(max-width: 991px) 100vw, 33vw"
              />
            ))}
            {caseStudy.galleryVideos.map((video) => (
              <CaseStudyVideoBlock
                key={video.src}
                video={video}
                className={
                  video.aspect === "wide"
                    ? "case-study-gallery-video case-study-gallery-video-wide"
                    : "case-study-gallery-video"
                }
              />
            ))}
          </div>
        </div>
      </section>

      <section className="case-study-testimonial">
        <div className="site-container case-study-testimonial-inner">
          <div className="case-study-testimonial-copy">
            <blockquote>
              <p>{caseStudy.testimonial.quote}</p>
            </blockquote>
            <div className="case-study-testimonial-person">
              <strong>{caseStudy.testimonial.name}</strong>
              <span>{caseStudy.testimonial.role}</span>
            </div>
            {caseStudy.testimonial.storyTitle ? (
              <div className="case-study-story-card">
                <span>{caseStudy.testimonial.storyTitle}</span>
                <span>Read the full story here -&gt;</span>
              </div>
            ) : null}
          </div>
          {caseStudy.testimonial.image ? (
            <Image
              className="case-study-testimonial-image"
              src={caseStudy.testimonial.image.src}
              alt={caseStudy.testimonial.image.alt}
              width={caseStudy.testimonial.image.width}
              height={caseStudy.testimonial.image.height}
              sizes="(max-width: 991px) 90vw, 40vw"
            />
          ) : null}
        </div>
      </section>

      {relatedStudies.length ? (
        <section className="case-study-related">
          <div className="site-container">
            <h2>Related Studies</h2>
            <div className="case-study-related-grid">
              {relatedStudies.map((related) => (
                <Link
                  key={related.slug}
                  href={`/work/${related.slug}`}
                  className="case-study-related-card"
                >
                  <Image
                    src={related.coverImage.src}
                    alt=""
                    width={related.coverImage.width}
                    height={related.coverImage.height}
                    sizes="(max-width: 767px) 100vw, 50vw"
                  />
                  <h3>{related.title}</h3>
                  <p>{related.problem.body}</p>
                  <span>See More -&gt;</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}

function CaseStudySummary({ title, body }: { title: string; body: string }) {
  return (
    <div className="case-study-summary">
      <h2>{title}</h2>
      <p>{body}</p>
    </div>
  );
}

function CaseStudyVideoBlock({
  video,
  className,
}: {
  video: CaseStudyVideo;
  className?: string;
}) {
  return (
    <div className={className}>
      <video
        title={video.title}
        playsInline
        autoPlay
        muted
        loop
        controls={false}
        poster={video.poster}
      >
        <source src={video.src} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}
