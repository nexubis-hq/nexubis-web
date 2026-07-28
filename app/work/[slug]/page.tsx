import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { CaseStudyTemplate } from "@/components/work/CaseStudyTemplate";
import { getAllCaseStudies, getCaseStudyBySlug } from "@/lib/work/data";

const SITE_URL = "https://www.nexubis.io";

type WorkPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return getAllCaseStudies().map((caseStudy) => ({
    slug: caseStudy.slug,
  }));
}

export async function generateMetadata({ params }: WorkPageProps): Promise<Metadata> {
  const { slug } = await params;
  const caseStudy = getCaseStudyBySlug(slug);

  if (!caseStudy) return {};

  const canonical = `${SITE_URL}/work/${caseStudy.slug}`;
  const ogImage = caseStudy.seo.ogImage
    ? new URL(caseStudy.seo.ogImage, SITE_URL).toString()
    : undefined;

  return {
    title: caseStudy.seo.title,
    description: caseStudy.seo.description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: caseStudy.seo.title,
      description: caseStudy.seo.description,
      url: canonical,
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
  };
}

export default async function WorkCaseStudyPage({ params }: WorkPageProps) {
  const { slug } = await params;
  const caseStudy = getCaseStudyBySlug(slug);

  if (!caseStudy) {
    notFound();
  }

  return (
    <>
      <SiteHeader />
      <CaseStudyTemplate caseStudy={caseStudy} />
      <SiteFooter />
    </>
  );
}
