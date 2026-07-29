import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { CaseStudy } from "@/lib/work/types";
import { getRelatedCaseStudies } from "@/lib/work/data";
import { CaseStudyVideo } from "@/components/work/CaseStudyVideo";

type CaseStudyTemplateProps = {
  caseStudy: CaseStudy;
};

export function CaseStudyTemplate({ caseStudy }: CaseStudyTemplateProps) {
  const relatedStudies = getRelatedCaseStudies(caseStudy.relatedSlugs);

  return (
    <main className={`case-study-page case-study-${caseStudy.slug}`}>
      <section className="case-study-hero">
        <div className="site-container case-study-hero-inner">
          <div className="case-study-hero-grid">
            <div className="case-study-hero-title-col">
              <h1 className="case-study-title">{caseStudy.title}</h1>
            </div>
            <div className="case-study-hero-tags-col">
              <ul className="case-study-tags" aria-label="Services">
                {caseStudy.services.map((service) => (
                  <li key={service}>
                    <span>{service}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="case-study-hero-reel-row">
            <CaseStudyVideo video={caseStudy.heroVideo} className="case-study-hero-video" isHero />
          </div>
        </div>
      </section>

      <section className="case-study-content">
        <div className="site-container">
          <div className="case-study-content-grid">
            <aside className="case-study-sidebar" aria-label="Project summary">
              <CaseStudySummary title={caseStudy.problem.title} body={caseStudy.problem.body} />
              <CaseStudySummary title={caseStudy.solution.title} body={caseStudy.solution.body} />
              <CaseStudyClientLinks caseStudy={caseStudy} />
            </aside>

            <div className="case-study-gallery" aria-label={`${caseStudy.title} media`}>
              {caseStudy.mediaItems.map((item, index) => {
                const className = `case-study-gallery-item case-study-gallery-item-${index + 1} case-study-gallery-${item.span}`;

                if (item.type === "image") {
                  return (
                    <div key={item.image.src} className={`${className} case-study-gallery-frame`}>
                      <Image
                        className="case-study-gallery-image"
                        src={item.image.src}
                        alt={item.image.alt}
                        width={item.image.width}
                        height={item.image.height}
                        sizes={getGalleryImageSizes(item.span)}
                        quality={95}
                      />
                    </div>
                  );
                }

                return (
                  <CaseStudyVideo
                    key={item.video.src}
                    video={item.video}
                    className={`${className} case-study-gallery-frame case-study-gallery-video case-study-gallery-video-${item.video.aspect}`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="case-study-testimonial">
        <div className="site-container case-study-testimonial-inner">
          <div className="case-study-testimonial-copy">
            <blockquote>
              <TestimonialQuoteMark className="case-study-testimonial-mark case-study-testimonial-mark-start" />
              <p>{caseStudy.testimonial.quote}</p>
              <TestimonialQuoteMark className="case-study-testimonial-mark case-study-testimonial-mark-end" end />
            </blockquote>
            <div className="case-study-testimonial-person">
              <strong>{caseStudy.testimonial.name}</strong>
              <span>{caseStudy.testimonial.role}</span>
            </div>
            {caseStudy.testimonial.storyTitle ? (
              <Link
                href={caseStudy.testimonial.storyHref ?? "#"}
                className="case-study-story-card"
              >
                {caseStudy.testimonial.storyThumbnail ? (
                  <Image
                    src={caseStudy.testimonial.storyThumbnail}
                    alt=""
                    width={384}
                    height={216}
                    sizes="12rem"
                  />
                ) : (
                  <Image
                    src={caseStudy.coverImage.src}
                    alt=""
                    width={caseStudy.coverImage.width}
                    height={caseStudy.coverImage.height}
                    sizes="12rem"
                  />
                )}
                <div>
                  <span>{caseStudy.testimonial.storyTitle}</span>
                  <span className="case-study-story-link">
                    <span>Read the full story here</span>
                    <span aria-hidden="true">→</span>
                  </span>
                </div>
              </Link>
            ) : null}
          </div>
        </div>
        {caseStudy.testimonial.image ? (
          <Image
            className="case-study-testimonial-image"
            src={caseStudy.testimonial.image.src}
            alt={caseStudy.testimonial.image.alt}
            width={caseStudy.testimonial.image.width}
            height={caseStudy.testimonial.image.height}
            sizes="(max-width: 991px) 100vw, 45vw"
          />
        ) : null}
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
                  <span className="case-study-related-link">
                    <span>See More</span>
                    <span aria-hidden="true">→</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}

function getGalleryImageSizes(span: "wide" | "narrow" | "half" | "full") {
  const desktop = {
    wide: "44vw",
    narrow: "15vw",
    half: "30vw",
    full: "59vw",
  }[span];

  const tablet = {
    wide: "66vw",
    narrow: "22vw",
    half: "44vw",
    full: "88vw",
  }[span];

  return `(max-width: 479px) 88vw, (max-width: 991px) ${tablet}, ${desktop}`;
}

function CaseStudySummary({ title, body }: { title: string; body: string }) {
  return (
    <div className="case-study-summary">
      <h2>{title}</h2>
      <p>{body}</p>
    </div>
  );
}

function CaseStudyClientLinks({ caseStudy }: { caseStudy: CaseStudy }) {
  const linkOrder = ["Website", "LinkedIn", "X", "Facebook"];
  const clientName = getClientName(caseStudy);
  const links = linkOrder
    .map((label) => caseStudy.links.find((link) => link.label === label))
    .filter((link): link is NonNullable<typeof link> => Boolean(link));

  return (
    <div className="case-study-share" aria-label={`${caseStudy.title} links`}>
      {links.map((link) => (
        <a
          key={`${link.label}-${link.href}`}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Visit ${clientName} ${link.label === "Website" ? "website" : `on ${link.label}`}`}
        >
          <CaseStudyClientIcon label={link.label} />
        </a>
      ))}
    </div>
  );
}

function getClientName(caseStudy: CaseStudy) {
  const clientNames: Record<CaseStudy["slug"], string> = {
    altify: "Altify",
    circuit: "Circuit",
    oxipack: "Oxipack",
  };

  return clientNames[caseStudy.slug];
}

function CaseStudyClientIcon({ label }: { label: string }) {
  if (label === "LinkedIn") {
    return <LinkedInIcon />;
  }

  if (label === "X") {
    return <XIcon />;
  }

  if (label === "Facebook") {
    return <FacebookIcon />;
  }

  return <ShareLinkIcon />;
}

function TestimonialQuoteMark({ className, end = false }: { className: string; end?: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      viewBox="0 0 113 91"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {end ? (
        <path
          opacity="0.5"
          d="M102.909 77.4501C95.0231 86.0438 83.0904 90.3999 67.4481 90.3999H61.8274V74.4726L66.3464 73.5629C74.0467 72.0148 79.4032 68.9695 82.2698 64.5003C83.7659 62.0929 84.6143 59.3361 84.7316 56.4999H67.4481C65.9574 56.4999 64.5277 55.9047 63.4737 54.8451C62.4196 53.7855 61.8274 52.3484 61.8274 50.8499V11.3C61.8274 5.06804 66.8691 0 73.0687 0H106.793C108.283 0 109.713 0.595261 110.767 1.65484C111.821 2.71442 112.413 4.15152 112.413 5.64999V33.9L112.397 50.3923C112.447 51.0194 113.515 65.8789 102.909 77.4501ZM11.2414 0H44.9654C46.4561 0 47.8857 0.595261 48.9398 1.65484C49.9939 2.71442 50.5861 4.15152 50.5861 5.64999V33.9L50.5692 50.3923C50.6198 51.0194 51.6877 65.8789 41.0815 77.4501C33.1957 86.0438 21.263 90.3999 5.62074 90.3999H6.86646e-05V74.4726L4.5191 73.5629C12.2194 72.0148 17.5759 68.9695 20.4424 64.5003C21.9386 62.0929 22.7869 59.3361 22.9043 56.4999H5.62074C4.13004 56.4999 2.7004 55.9047 1.64632 54.8451C0.592247 53.7855 6.86646e-05 52.3484 6.86646e-05 50.8499V11.3C6.86646e-05 5.06804 5.04182 0 11.2414 0Z"
          fill="currentColor"
          fillOpacity="0.5"
        />
      ) : (
        <path
          opacity="0.5"
          d="M9.53989 12.9498C17.4257 4.35614 29.3584 0 45.0007 0H50.6213V15.9273L46.1023 16.837C38.402 18.3851 33.0455 21.4304 30.179 25.8996C28.6828 28.307 27.8345 31.0638 27.7171 33.9H45.0007C46.4914 33.9 47.921 34.4952 48.9751 35.5548C50.0292 36.6144 50.6213 38.0515 50.6213 39.55V79.0999C50.6213 85.3319 45.5796 90.3999 39.38 90.3999H5.65601C4.16531 90.3999 2.73568 89.8046 1.6816 88.7451C0.627517 87.6855 0.0353418 86.2484 0.0353418 84.7499V56.4999L0.0522039 40.0076C0.00161793 39.3805 -1.06631 24.521 9.53989 12.9498ZM101.207 90.3999H67.4833C65.9926 90.3999 64.563 89.8046 63.5089 88.7451C62.4548 87.6855 61.8627 86.2484 61.8627 84.7499V56.4999L61.8795 40.0076C61.8289 39.3805 60.761 24.521 71.3672 12.9498C79.253 4.35614 91.1857 0 106.828 0H112.449V15.9273L107.93 16.837C100.229 18.3851 94.8728 21.4304 92.0063 25.8996C90.5101 28.307 89.6618 31.0638 89.5444 33.9H106.828C108.319 33.9 109.748 34.4952 110.802 35.5548C111.856 36.6144 112.449 38.0515 112.449 39.55V79.0999C112.449 85.3319 107.407 90.3999 101.207 90.3999Z"
          fill="currentColor"
          fillOpacity="0.5"
        />
      )}
    </svg>
  );
}

function ShareIconBase({ children }: { children: ReactNode }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="0.5" y="0.5" width="31" height="31" rx="15.5" fill="currentColor" />
      <rect x="0.5" y="0.5" width="31" height="31" rx="15.5" stroke="currentColor" />
      {children}
    </svg>
  );
}

function ShareLinkIcon() {
  return (
    <ShareIconBase>
      <path d="M8.22172 23.778C8.68559 24.2425 9.23669 24.6108 9.84334 24.8617C10.45 25.1126 11.1002 25.2411 11.7567 25.24C12.4133 25.2411 13.0637 25.1125 13.6705 24.8617C14.2774 24.6108 14.8286 24.2425 15.2927 23.778L18.1207 20.949L16.7067 19.535L13.8787 22.364C13.3152 22.925 12.5524 23.2399 11.7572 23.2399C10.962 23.2399 10.1992 22.925 9.63572 22.364C9.07422 21.8007 8.75892 21.0378 8.75892 20.2425C8.75892 19.4471 9.07422 18.6842 9.63572 18.121L12.4647 15.293L11.0507 13.879L8.22172 16.707C7.28552 17.6454 6.75977 18.9169 6.75977 20.2425C6.75977 21.568 7.28552 22.8395 8.22172 23.778ZM23.7777 15.293C24.7134 14.3542 25.2388 13.0829 25.2388 11.7575C25.2388 10.432 24.7134 9.16068 23.7777 8.22196C22.8393 7.28577 21.5678 6.76001 20.2422 6.76001C18.9166 6.76001 17.6452 7.28577 16.7067 8.22196L13.8787 11.051L15.2927 12.465L18.1207 9.63596C18.6842 9.07495 19.447 8.75999 20.2422 8.75999C21.0374 8.75999 21.8002 9.07495 22.3637 9.63596C22.9252 10.1992 23.2405 10.9621 23.2405 11.7575C23.2405 12.5528 22.9252 13.3157 22.3637 13.879L19.5347 16.707L20.9487 18.121L23.7777 15.293Z" fill="white" />
      <path d="M12.4637 20.95L11.0487 19.536L19.5357 11.05L20.9497 12.465L12.4637 20.95Z" fill="white" />
    </ShareIconBase>
  );
}

function LinkedInIcon() {
  return (
    <ShareIconBase>
      <path fillRule="evenodd" clipRule="evenodd" d="M8.5 7.24268C7.67157 7.24268 7 7.91425 7 8.74268V23.7427C7 24.5711 7.67157 25.2427 8.5 25.2427H23.5C24.3284 25.2427 25 24.5711 25 23.7427V8.74268C25 7.91425 24.3284 7.24268 23.5 7.24268H8.5ZM12.5208 11.2454C12.5264 12.2016 11.8106 12.7909 10.9612 12.7866C10.1611 12.7824 9.46357 12.1454 9.46779 11.2468C9.47201 10.4016 10.14 9.72243 11.0076 9.74212C11.8879 9.76181 12.5264 10.4073 12.5208 11.2454ZM16.2797 14.0044H13.7597H13.7583V22.5643H16.4217V22.3646C16.4217 21.9847 16.4214 21.6047 16.4211 21.2246C16.4203 20.2108 16.4194 19.1959 16.4246 18.1824C16.426 17.9363 16.4372 17.6804 16.5005 17.4455C16.7381 16.568 17.5271 16.0013 18.4074 16.1406C18.9727 16.2291 19.3467 16.5568 19.5042 17.0898C19.6013 17.423 19.6449 17.7816 19.6491 18.129C19.6605 19.1766 19.6589 20.2242 19.6573 21.2719C19.6567 21.6417 19.6561 22.0117 19.6561 22.3815V22.5629H22.328V22.3576C22.328 21.9056 22.3278 21.4537 22.3275 21.0018C22.327 19.8723 22.3264 18.7428 22.3294 17.6129C22.3308 17.1024 22.276 16.599 22.1508 16.1054C21.9638 15.3713 21.5771 14.7638 20.9485 14.3251C20.5027 14.0129 20.0133 13.8118 19.4663 13.7893C19.404 13.7867 19.3412 13.7833 19.2781 13.7799C18.9984 13.7648 18.7141 13.7494 18.4467 13.8033C17.6817 13.9566 17.0096 14.3068 16.5019 14.9241C16.4429 14.9949 16.3852 15.0668 16.2991 15.1741L16.2797 15.1984V14.0044ZM9.68164 22.5671H12.3324V14.01H9.68164V22.5671Z" fill="white" />
    </ShareIconBase>
  );
}

function XIcon() {
  return (
    <ShareIconBase>
      <path d="M21.1761 8.24268H23.9362L17.9061 15.0201L25 24.2427H19.4456L15.0951 18.6493L10.1172 24.2427H7.35544L13.8052 16.9935L7 8.24268H12.6954L16.6279 13.3553L21.1761 8.24268ZM20.2073 22.6181H21.7368L11.8644 9.78196H10.2232L20.2073 22.6181Z" fill="white" />
    </ShareIconBase>
  );
}

function FacebookIcon() {
  return (
    <ShareIconBase>
      <path d="M26 16.3038C26 10.7472 21.5229 6.24268 16 6.24268C10.4771 6.24268 6 10.7472 6 16.3038C6 21.3255 9.65684 25.4879 14.4375 26.2427V19.2121H11.8984V16.3038H14.4375V14.0872C14.4375 11.5656 15.9305 10.1728 18.2146 10.1728C19.3088 10.1728 20.4531 10.3693 20.4531 10.3693V12.8453H19.1922C17.95 12.8453 17.5625 13.6209 17.5625 14.4166V16.3038H20.3359L19.8926 19.2121H17.5625V26.2427C22.3432 25.4879 26 21.3257 26 16.3038Z" fill="white" />
    </ShareIconBase>
  );
}
