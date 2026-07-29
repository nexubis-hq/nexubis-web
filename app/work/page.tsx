import type { Metadata } from "next";
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
  const caseStudies = getAllCaseStudies();

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
                <Link
                  key={caseStudy.slug}
                  href={`/work/${caseStudy.slug}`}
                  className="work-index-card"
                >
                  <span className="work-index-card-media">
                    <img
                      src={caseStudy.coverImage.src}
                      alt={caseStudy.coverImage.alt}
                      width={caseStudy.coverImage.width}
                      height={caseStudy.coverImage.height}
                    />
                  </span>
                  <span className="work-index-card-body">
                    <span className="work-index-card-title">
                      {caseStudy.title.replace(/\s+/g, " ")}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
