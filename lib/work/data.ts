import type { CaseStudy, WorkSlug } from "@/lib/work/types";

const caseStudies: CaseStudy[] = [
  {
    slug: "altify",
    title: "Altify Merger Relaunch",
    services: [
      "Website Design",
      "Creative Direction",
      "Brand Development",
      "Motion, 2D, 3D Graphics",
      "UI/UX Design",
      "Webflow Development",
      "CMS Development",
      "Automation & Integration",
      "Pitchdecks",
      "Documentation",
      "Social Media & Marketing",
    ],
    problem: {
      title: "The Problem",
      body: "Traditional investing is gated, complex, and built for the few. For most people, accessing high-performing private markets felt out of reach - locked behind jargon, minimums, and outdated systems that intimidated instead of empowered.",
    },
    solution: {
      title: "Our Solution",
      body: "Altify broke those walls. Together, we built a brand and platform that made institutional-grade investing accessible, intuitive, and human - from rebranding Revix to Altify to designing an app and identity that turns financial complexity into confidence.",
    },
    coverImage: {
      src: "/assets/work/altify/thumbnail.avif",
      alt: "Altify project preview",
      width: 3840,
      height: 2160,
    },
    heroVideo: {
      src: "https://pub-d0adc0fc26c84d8e8c8db97d1ab2d30f.r2.dev/nexubis/altify/Altify%20Specific%20Showreel.mp4",
      title: "Altify project showreel",
      poster: "/assets/work/altify/hero-poster.webp",
      aspect: "hero",
    },
    galleryImages: [
      {
        src: "/assets/work/altify/gallery-1.avif",
        alt: "Altify brand and platform design",
        width: 1206,
        height: 575,
      },
      {
        src: "/assets/work/altify/gallery-2.avif",
        alt: "Altify mobile interface design",
        width: 403,
        height: 575,
      },
      {
        src: "/assets/work/altify/gallery-3.avif",
        alt: "Altify digital product screens",
        width: 803,
        height: 575,
      },
    ],
    galleryVideos: [
      {
        src: "https://pub-d0adc0fc26c84d8e8c8db97d1ab2d30f.r2.dev/nexubis/altify/TEMPLATE%20LONG.mp4",
        title: "Altify wide campaign motion",
        poster: "/assets/work/altify/gallery-video-1-poster.png",
        aspect: "wide",
      },
      {
        src: "https://pub-d0adc0fc26c84d8e8c8db97d1ab2d30f.r2.dev/nexubis/altify/BTC%20MOON%202.mp4",
        title: "Altify square campaign motion",
        poster: "/assets/work/altify/gallery-video-2-poster.png",
        aspect: "square",
      },
    ],
    mediaItems: [
      { type: "image", image: { src: "/assets/work/altify/gallery-1.avif", alt: "Altify brand and platform design", width: 1206, height: 575 }, span: "wide" },
      { type: "image", image: { src: "/assets/work/altify/gallery-2.avif", alt: "Altify mobile interface design", width: 403, height: 575 }, span: "narrow" },
      {
        type: "video",
        video: {
          src: "https://pub-d0adc0fc26c84d8e8c8db97d1ab2d30f.r2.dev/nexubis/altify/TEMPLATE%20LONG.mp4",
          title: "Altify wide campaign motion",
          poster: "/assets/work/altify/gallery-video-1-poster.png",
          aspect: "wide",
        },
        span: "wide",
      },
      { type: "image", image: { src: "/assets/work/altify/gallery-3.avif", alt: "Altify digital product screens", width: 803, height: 575 }, span: "half" },
      {
        type: "video",
        video: {
          src: "https://pub-d0adc0fc26c84d8e8c8db97d1ab2d30f.r2.dev/nexubis/altify/BTC%20MOON%202.mp4",
          title: "Altify square campaign motion",
          poster: "/assets/work/altify/gallery-video-2-poster.png",
          aspect: "square",
        },
        span: "half",
      },
    ],
    testimonial: {
      quote: "Nexubis has been part of our journey since the early days. They didn't just deliver design - they helped shape how we communicate, how we present, and how our brand feels. What stands out most is their consistency and care. Every project feels personal, like they're as invested in Altify's success as we are.",
      name: "Sean Sanders",
      role: "CEO & Founder",
      image: {
        src: "/assets/work/altify/testimonial.avif",
        alt: "Sean Sanders",
        width: 2018,
        height: 2128,
      },
      storyTitle: "Altify: Empowering Nexubis",
      storyHref: "/post/altify-empowering-nexubis",
      storyThumbnail: "/assets/work/altify/story-thumbnail.avif",
    },
    links: [
      { label: "LinkedIn", href: "https://www.linkedin.com/company/altifyinvest/" },
      { label: "Facebook", href: "https://www.facebook.com/AltifyInvest/" },
      { label: "X", href: "https://x.com/Altifyinvest" },
      { label: "Website", href: "https://www.altify.app/" },
    ],
    relatedSlugs: ["circuit", "oxipack"],
    seo: {
      title: "Altify Merger Relaunch | Nexubis",
      description:
        "Altify broke investing complexity into a brand and platform experience that made institutional-grade investing feel accessible, intuitive and human.",
      ogImage: "/assets/work/altify/thumbnail.avif",
    },
  },
  {
    slug: "circuit",
    title: "Circuit Rebrand and  Website launch",
    services: [
      "Website Design",
      "Creative Direction",
      "Brand Development",
      "Motion, 2D, 3D Graphics",
      "UI/UX Design",
      "Webflow Development",
      "Pitchdecks",
      "Documentation",
      "Social Media & Marketing",
    ],
    problem: {
      title: "The Problem",
      body: "Web3 recovery had no clear language. Complex custody mechanics, abstract failover logic, and fragmented communication made it hard for compliance teams, engineers, and executives to understand, or trust, how assets could be protected when things went wrong.",
    },
    solution: {
      title: "Our Solution",
      body: "Together with Circuit, we built clarity into complexity. From redefining their brand and visual system to designing educational motion frameworks and recovery diagrams, we created a scalable identity and narrative that turned asset recovery into a story of trust, precision, and control.",
    },
    coverImage: {
      src: "/assets/work/circuit/thumbnail.png",
      alt: "Circuit project preview",
      width: 3840,
      height: 2160,
    },
    heroVideo: {
      src: "https://pub-d0adc0fc26c84d8e8c8db97d1ab2d30f.r2.dev/nexubis/circuit/Circuit%20Specific%20Showreel.mp4",
      title: "Circuit project showreel",
      poster: "/assets/work/circuit/hero-poster.webp",
      aspect: "hero",
    },
    galleryImages: [
      {
        src: "/assets/work/circuit/gallery-1.avif",
        alt: "Circuit brand system and interface work",
        width: 1206,
        height: 575,
      },
      {
        src: "/assets/work/circuit/gallery-2.avif",
        alt: "Circuit brand application detail",
        width: 403,
        height: 575,
      },
      {
        src: "/assets/work/circuit/gallery-3.avif",
        alt: "Circuit digital design system",
        width: 803,
        height: 575,
      },
      {
        src: "/assets/work/circuit/gallery-4.avif",
        alt: "Circuit launch artwork",
        width: 1640,
        height: 1169,
      },
    ],
    galleryVideos: [
      {
        src: "https://pub-d0adc0fc26c84d8e8c8db97d1ab2d30f.r2.dev/nexubis/circuit/01.mp4",
        title: "Circuit wide campaign motion",
        poster: "/assets/work/circuit/gallery-video-1-poster.png",
        aspect: "wide",
      },
      {
        src: "https://pub-d0adc0fc26c84d8e8c8db97d1ab2d30f.r2.dev/nexubis/circuit/02.mp4",
        title: "Circuit square campaign motion",
        poster: "/assets/work/circuit/gallery-video-2-poster.png",
        aspect: "square",
      },
    ],
    mediaItems: [
      { type: "image", image: { src: "/assets/work/circuit/gallery-1.avif", alt: "Circuit brand system and interface work", width: 1206, height: 575 }, span: "wide" },
      { type: "image", image: { src: "/assets/work/circuit/gallery-2.avif", alt: "Circuit brand application detail", width: 403, height: 575 }, span: "narrow" },
      {
        type: "video",
        video: {
          src: "https://pub-d0adc0fc26c84d8e8c8db97d1ab2d30f.r2.dev/nexubis/circuit/01.mp4",
          title: "Circuit wide campaign motion",
          poster: "/assets/work/circuit/gallery-video-1-poster.png",
          aspect: "wide",
        },
        span: "wide",
      },
      { type: "image", image: { src: "/assets/work/circuit/gallery-3.avif", alt: "Circuit digital design system", width: 803, height: 575 }, span: "half" },
      {
        type: "video",
        video: {
          src: "https://pub-d0adc0fc26c84d8e8c8db97d1ab2d30f.r2.dev/nexubis/circuit/02.mp4",
          title: "Circuit square campaign motion",
          poster: "/assets/work/circuit/gallery-video-2-poster.png",
          aspect: "square",
        },
        span: "half",
      },
      { type: "image", image: { src: "/assets/work/circuit/gallery-4.avif", alt: "Circuit launch artwork", width: 1640, height: 1169 }, span: "full" },
    ],
    testimonial: {
      quote: "Working with Nexubis felt less like hiring an agency and more like adding an extension to our own team. They understood the nuance of what we were building - translating complex security concepts into something clear, visual, and credible. The result wasn't just great design; it was real alignment between message, mission, and impact.",
      name: "Harry Donnelly",
      role: "CEO & Founder",
      image: {
        src: "/assets/work/circuit/testimonial.avif",
        alt: "Harry Donnelly",
        width: 2018,
        height: 2128,
      },
      storyTitle: "Circuit: Securing Nexubis",
      storyHref: "/post/circuit-securing-nexubis",
      storyThumbnail: "/assets/work/circuit/story-thumbnail.avif",
    },
    links: [
      { label: "LinkedIn", href: "https://www.linkedin.com/company/circuitsecurity/" },
      { label: "X", href: "https://x.com/CircuitSecurity" },
      { label: "Website", href: "https://www.circuitsecurity.com/" },
    ],
    relatedSlugs: ["altify", "oxipack"],
    seo: {
      title: "Circuit Rebrand and Website launch | Nexubis",
      description:
        "Circuit and Nexubis turned complex Web3 recovery into a clearer brand, website and motion system for trust, precision and control.",
      ogImage: "/assets/work/circuit/thumbnail.png",
    },
  },
  {
    slug: "oxipack",
    title: "Oxipack Website Redesign and Rebuild",
    services: [
      "Creative Direction",
      "Website Design",
      "Brand Development",
      "Motion, 2D, 3D Graphics",
      "Webflow Development",
      "CMS Development",
      "Automation & Integration",
      "Educational Decks",
      "Documentation",
      "Social Media & Marketing",
    ],
    problem: {
      title: "The Problem",
      body: "Industrial brands often struggle to communicate innovation in a category known for complexity, cluttered messaging, and outdated digital systems. Oxipack's breakthrough technology in non-destructive leak detection deserved a platform that matched its precision, sustainability, and global scale.",
    },
    solution: {
      title: "Our Solution",
      body: "We rebuilt Oxipack's brand and digital presence from the ground up - transforming their website, visuals, and campaigns into a clear, modern identity that showcases their engineering excellence and global impact. What started as a rebuild became a partnership built on trust, momentum, and shared growth.",
    },
    coverImage: {
      src: "/assets/work/oxipack/thumbnail.avif",
      alt: "Oxipack project preview",
      width: 3840,
      height: 2160,
    },
    heroVideo: {
      src: "https://pub-d0adc0fc26c84d8e8c8db97d1ab2d30f.r2.dev/nexubis/oxipack/Oxipack%20Specific%20Showreel.mp4",
      title: "Oxipack project showreel",
      poster: "/assets/work/oxipack/hero-poster.webp",
      aspect: "hero",
    },
    galleryImages: [
      {
        src: "/assets/work/oxipack/gallery-1.avif",
        alt: "Oxipack website and brand system",
        width: 1206,
        height: 575,
      },
      {
        src: "/assets/work/oxipack/gallery-2.avif",
        alt: "Oxipack brand application detail",
        width: 403,
        height: 575,
      },
      {
        src: "/assets/work/oxipack/gallery-3.avif",
        alt: "Oxipack digital design screens",
        width: 803,
        height: 575,
      },
    ],
    galleryVideos: [
      {
        src: "https://pub-d0adc0fc26c84d8e8c8db97d1ab2d30f.r2.dev/nexubis/oxipack/TEMPLATE%20LONG.mp4",
        title: "Oxipack wide campaign motion",
        poster: "/assets/work/oxipack/gallery-video-1-poster.png",
        aspect: "wide",
      },
      {
        src: "https://pub-d0adc0fc26c84d8e8c8db97d1ab2d30f.r2.dev/nexubis/oxipack/TEMPLATE%20SQUARE.mp4",
        title: "Oxipack square campaign motion",
        poster: "/assets/work/oxipack/gallery-video-2-poster.png",
        aspect: "square",
      },
    ],
    mediaItems: [
      { type: "image", image: { src: "/assets/work/oxipack/gallery-1.avif", alt: "Oxipack website and brand system", width: 1206, height: 575 }, span: "wide" },
      { type: "image", image: { src: "/assets/work/oxipack/gallery-2.avif", alt: "Oxipack brand application detail", width: 403, height: 575 }, span: "narrow" },
      {
        type: "video",
        video: {
          src: "https://pub-d0adc0fc26c84d8e8c8db97d1ab2d30f.r2.dev/nexubis/oxipack/TEMPLATE%20LONG.mp4",
          title: "Oxipack wide campaign motion",
          poster: "/assets/work/oxipack/gallery-video-1-poster.png",
          aspect: "wide",
        },
        span: "wide",
      },
      { type: "image", image: { src: "/assets/work/oxipack/gallery-3.avif", alt: "Oxipack digital design screens", width: 803, height: 575 }, span: "half" },
      {
        type: "video",
        video: {
          src: "https://pub-d0adc0fc26c84d8e8c8db97d1ab2d30f.r2.dev/nexubis/oxipack/TEMPLATE%20SQUARE.mp4",
          title: "Oxipack square campaign motion",
          poster: "/assets/work/oxipack/gallery-video-2-poster.png",
          aspect: "square",
        },
        span: "half",
      },
    ],
    testimonial: {
      quote: "Nexubis brought structure, speed, and creativity to every project we tackled together. They didn't just rebuild our website - they elevated how we communicate as a brand. Working with them feels effortless: they understand our needs, move fast, and always deliver more than expected.",
      name: "Brigitte van der Watt",
      role: "Marketing Manager",
      image: {
        src: "/assets/work/oxipack/testimonial.avif",
        alt: "Brigitte van der Watt",
        width: 2018,
        height: 2128,
      },
      storyTitle: "Oxipack: Empowering Nexubis",
      storyHref: "/post/oxipack-empowering-nexubis",
      storyThumbnail: "/assets/work/oxipack/story-thumbnail.avif",
    },
    links: [
      { label: "LinkedIn", href: "https://www.linkedin.com/company/oxipack/" },
      { label: "Facebook", href: "https://www.facebook.com/OxipackLeakDetection?mibextid=LQQJ4d" },
      { label: "X", href: "https://x.com/Oxipack" },
      { label: "Website", href: "https://www.oxipack.com/" },
    ],
    relatedSlugs: ["circuit", "altify"],
    seo: {
      title: "Oxipack Website Redesign and Rebuild | Nexubis",
      description:
        "Oxipack and Nexubis rebuilt an industrial brand and digital presence around precision, sustainability and global scale.",
      ogImage: "/assets/work/oxipack/thumbnail.avif",
    },
  },
];

export function getAllCaseStudies() {
  return caseStudies;
}

export function getCaseStudyBySlug(slug: string) {
  return caseStudies.find((caseStudy) => caseStudy.slug === slug);
}

export function getRelatedCaseStudies(slugs: WorkSlug[]) {
  return slugs
    .map((slug) => getCaseStudyBySlug(slug))
    .filter((caseStudy): caseStudy is CaseStudy => Boolean(caseStudy));
}
