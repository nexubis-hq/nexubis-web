import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getAllCaseStudies } from "@/lib/work/data";

const SITE_URL = "https://www.nexubis.io";

export const metadata: Metadata = {
  title: "Work",
  alternates: {
    canonical: `${SITE_URL}/work`,
  },
  openGraph: {
    title: "Work",
    url: `${SITE_URL}/work`,
  },
  twitter: {
    title: "Work",
  },
};

export default function WorkIndexPage() {
  const caseStudyOrder = ["circuit", "altify", "oxipack"];
  const allCaseStudies = getAllCaseStudies();
  const caseStudies = caseStudyOrder
    .map((slug) => allCaseStudies.find((caseStudy) => caseStudy.slug === slug))
    .filter((caseStudy): caseStudy is (typeof allCaseStudies)[number] => Boolean(caseStudy));

  return (
    <>
      <SiteHeader />
      <main className="work-index-page">
        <section className="work-index-hero">
          <div className="site-container">
            <h1>Our work</h1>
          </div>
        </section>

        <section className="work-index-list-section">
          <div className="site-container">
            <div className="work-index-grid">
              {caseStudies.map((caseStudy) => (
                <div key={caseStudy.slug} className="work-index-item">
                  <Link href={`/work/${caseStudy.slug}`} className="work-index-card">
                    <span className="work-index-card-media">
                      <Image
                        src={caseStudy.coverImage.src}
                        alt={caseStudy.coverImage.alt}
                        width={caseStudy.coverImage.width}
                        height={caseStudy.coverImage.height}
                        sizes="(max-width: 767px) 88vw, 44vw"
                        quality={95}
                      />
                    </span>
                    <span className="work-index-card-body">
                      <span className="work-index-card-title">
                        {caseStudy.title.replace(/\s+/g, " ")}
                      </span>
                    </span>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
