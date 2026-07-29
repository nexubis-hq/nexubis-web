import { WORK_SLUGS } from "@/lib/work/slugs";

export type WorkSlug = (typeof WORK_SLUGS)[number];

export type CaseStudyImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

export type CaseStudyVideo = {
  src: string;
  title: string;
  poster?: string;
  aspect: "wide" | "square" | "hero";
};

export type CaseStudyMediaItem =
  | {
      type: "image";
      image: CaseStudyImage;
      span: "wide" | "narrow" | "half" | "full";
    }
  | {
      type: "video";
      video: CaseStudyVideo;
      span: "wide" | "half";
    };

export type CaseStudyLink = {
  label: string;
  href: string;
};

export type CaseStudy = {
  slug: WorkSlug;
  title: string;
  services: string[];
  problem: {
    title: string;
    body: string;
  };
  solution: {
    title: string;
    body: string;
  };
  coverImage: CaseStudyImage;
  heroVideo: CaseStudyVideo;
  galleryImages: CaseStudyImage[];
  galleryVideos: CaseStudyVideo[];
  mediaItems: CaseStudyMediaItem[];
  testimonial: {
    quote: string;
    name: string;
    role: string;
    image?: CaseStudyImage;
    storyTitle?: string;
    storyHref?: string;
    storyThumbnail?: string;
  };
  links: CaseStudyLink[];
  relatedSlugs: WorkSlug[];
  seo: {
    title: string;
    description: string;
    ogImage?: string;
  };
};
