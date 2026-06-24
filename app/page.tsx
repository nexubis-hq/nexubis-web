import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader, RocketIcon } from "@/components/SiteHeader";
import { NexubisLogo } from "@/components/NexubisLogo";

const bookCallUrl = "https://calendly.com/nexubis/30min";

const logos = [
  ["altify.svg", "Altify", "https://altify.app/"],
  ["sataya.svg", "Sataya", "https://sataya.io/"],
  ["oxipack.svg", "Oxipack", "https://www.oxipack.com/"],
  ["ciruit.svg", "Circuit", "https://circuitprotect.com/"],
  ["blueknight.svg", "Blue Knight", "https://www.blueknight.io/"],
  ["usably.svg", "Usably", "https://www.usably.studio/"],
  ["lathyrus.svg", "Lathyrus", "https://www.lathyrus.io/"],
  ["view-16.svg", "View 16", "https://www.lathyrus.io/"],
  ["design-focus.svg", "Design Focus", "https://www.designfocus.io/"],
  ["emprise-digital.svg", "Emprise Digital", "https://www.emprise.co.za/"],
] as const;

const solutions = [
  {
    title: (
      <>
        Brand <br />
        Development
      </>
    ),
    text: "We craft brands that resonate and endure. From logos to full brand stories, we combine strategy and creativity to position your business at the forefront.",
    items: [
      "Brand Strategy",
      "Positioning",
      "Logo Design",
      "Visual Identity",
      "Brand Guidelines",
      "Style Guides",
      "Brand Messaging",
      "Brand Collateral",
    ],
  },
  {
    title: (
      <>
        Product &amp; <br />
        Web Design
      </>
    ),
    text: "We create intuitive, engaging designs that drives conversions. Our approach balances aesthetics with functionality to help your products stand out.",
    items: [
      "UX Research",
      "UI Design",
      "Prototyping",
      "Website Design",
      "Design Systems",
      "Usability Testing",
      "Usability Optimisation",
    ],
  },
  {
    title: (
      <>
        Web &amp; App <br />
        Development
      </>
    ),
    text: "We build scalable digital solutions that perform flawlessly across all devices. Our expertise brings your design vision to life with cutting-edge technology.",
    items: [
      "Website Development",
      "E-commerce",
      "Headless Shopify Solutions",
      "Framer Development",
      "Technical SEO",
      "UI Design",
      "Pitchdecks",
    ],
  },
];

const work = [
  {
    name: "Circuit",
    image: "circuit.png",
    tags: ["Webflow Development", "Product design"],
    href: "https://www.nexubis.io/work/circuit",
  },
  {
    name: "Oxipack",
    image: "oxipack.webp",
    tags: ["Webflow Development", "Design"],
    href: "https://www.nexubis.io/work/oxipack",
  },
  {
    name: "Altify",
    image: "altify.webp",
    tags: ["Webflow Development", "Product Design"],
    href: "https://www.nexubis.io/work/altify",
  },
  {
    name: "Sataya",
    image: "sataya.webp",
    tags: ["Webflow Development", "Visual Brand"],
    href: "https://www.nexubis.io/work/sataya",
  },
];

const steps = [
  {
    title: (
      <>
        Connect with Our <br />
        Sales Team
      </>
    ),
    image: "book-cal.png",
  },
  {
    title: "Collaborate on Your Custom Project Plan",
    image: "process_card-2.webp",
  },
  {
    title: "Design, Develop and Iterate",
    image: "process_card-3.webp",
  },
  {
    title: (
      <>
        Launch with <br />
        Confidence
      </>
    ),
    image: "process_card-4.webp",
  },
];

const faqs = [
  [
    "What makes Nexubis different from other design agencies?",
    "We don't just focus on aesthetics - our approach combines strategic thinking, technical expertise, and creative innovation to deliver solutions that not only look great but also drive results.",
  ],
  [
    "What services does Nexubis offer?",
    "Nexubis specializes in web design, Webflow development, 3D design, animation, and systems implementation. We create seamless digital experiences tailored to your unique needs, whether for corporate or personal projects.",
  ],
  [
    "Does Nexubis provide UI/UX design for apps and software?",
    "Yes! Our UI/UX design services focus on intuitive, user-friendly interfaces for web and mobile applications, ensuring a smooth and engaging experience for users.",
  ],
  [
    "Can Nexubis create custom animations and 3D designs?",
    "Absolutely! Our team crafts high-quality animations and 3D designs for product visualizations, brand storytelling, and interactive digital experiences that captivate audiences.",
  ],
  [
    "Can Nexubis integrate third-party tools and systems?",
    "Yes! We specialize in seamless integrations with platforms like CRM systems, payment gateways, analytics tools, and more to enhance functionality and streamline your business processes.",
  ],
  [
    "How does Nexubis approach system implementation?",
    "We analyze your business needs and implement custom systems and integrations that improve workflow, efficiency, and scalability. Whether automating processes or connecting multiple platforms, we ensure smooth operations.",
  ],
  [
    "How does Nexubis ensure websites are optimized for performance?",
    "We prioritize speed, SEO, and user experience by optimizing images, code, and structure. Our websites are built to load fast, rank well on search engines, and provide seamless navigation.",
  ],
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <Solutions />
        <Work />
        <Reviews />
        <Comparison />
        <Steps />
        <Faq />
        <CloudCta />
      </main>
      <SiteFooter />
    </>
  );
}

function Hero() {
  return (
    <section className="hero-section section">
      <div className="site-container hero-inner">
        <div className="hero-title-wrap">
          <h1>
            <span>
              Design,
              <br className="mobile-break" /> Development{" "}
            </span>
            — <br className="mobile-break" />
            and Growth <br className="mobile-break" />
            Powerhouse
          </h1>
        </div>

        <div className="hero-copy">
          <p>
            We&apos;re a Cape Town based B2B Design, Development and Growth
            Partner for startups and established businesses
          </p>
          <div className="btn-group">
            <Link href="/contact" className="btn btn-primary">
              <RocketIcon />
              <span>Get Started</span>
            </Link>
            <Link href="/packages" className="btn btn-secondary">
              Our Packages
            </Link>
          </div>
        </div>

        <div className="hero-reel">
          <img src="/assets/images/reel_draft.jpg" alt="" />
        </div>

        <div className="hero-logos" aria-label="Client logos">
          {logos.map(([image, label, href]) => (
            <a key={label} href={href} target="_blank" rel="noreferrer">
              <img src={`/assets/images/${image}`} alt={label} />
            </a>
          ))}
        </div>
      </div>
      <img className="hero-bg" src="/assets/images/nx-hero-bg.webp" alt="" />
    </section>
  );
}

function Eyebrow({
  children,
  dark = false,
}: {
  children: string;
  dark?: boolean;
}) {
  return (
    <div className={dark ? "eyebrow eyebrow-dark" : "eyebrow"}>
      <span>✦</span>
      <SparkleIcon />
      <p>{children}</p>
    </div>
  );
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 14 14" aria-hidden="true" className="eyebrow-icon">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.71609 5.50909C6.41842 5.36155 6.06888 5.36155 5.77117 5.50909C5.61212 5.5879 5.44205 5.75868 5.30769 5.89363C5.17274 6.02797 5.00196 6.19807 4.92315 6.35709C4.77562 6.65482 4.77562 7.00436 4.92315 7.30203C5.00196 7.46111 5.13807 7.59661 5.27303 7.73096L5.30769 7.76555L10.355 12.8129C10.4893 12.9479 10.6248 13.084 10.7839 13.1628C11.0816 13.3103 11.4311 13.3103 11.7289 13.1628C11.8879 13.084 12.058 12.9132 12.1923 12.7782C12.3273 12.6439 12.498 12.4738 12.5768 12.3148C12.7244 12.0171 12.7244 11.6675 12.5768 11.3698C12.498 11.2108 12.3619 11.0753 12.227 10.9409L7.17961 5.89363L7.14502 5.85898C7.01068 5.72401 6.87517 5.5879 6.71609 5.50909Z"
        fill="currentColor"
      />
      <path
        opacity="0.4"
        d="M9.91536 0.730469C10.0984 0.730469 10.2622 0.844452 10.3257 1.01614L10.4976 1.48083C10.737 2.12769 10.8184 2.32083 10.9571 2.45954C11.0959 2.59824 11.289 2.67968 11.9359 2.91904L12.4005 3.09099C12.5722 3.15452 12.6862 3.31823 12.6862 3.5013C12.6862 3.68437 12.5722 3.84808 12.4005 3.91161L11.9359 4.08356C11.289 4.32293 11.0959 4.40437 10.9571 4.54307C10.8184 4.68177 10.737 4.87491 10.4976 5.52178L10.3257 5.98648C10.2622 6.15815 10.0984 6.27214 9.91536 6.27214C9.73231 6.27214 9.56857 6.15815 9.50505 5.98648L9.33308 5.52178C9.09374 4.87491 9.01231 4.68177 8.87359 4.54307C8.73487 4.40437 8.54173 4.32293 7.89487 4.08356L7.43019 3.91161C7.25851 3.84808 7.14453 3.68437 7.14453 3.5013C7.14453 3.31823 7.25851 3.15452 7.43019 3.09099L7.89487 2.91904C8.54173 2.67968 8.73487 2.59824 8.87359 2.45954C9.01231 2.32083 9.09374 2.12769 9.33308 1.48083L9.50505 1.01614C9.56857 0.844452 9.73231 0.730469 9.91536 0.730469Z"
        fill="currentColor"
      />
    </svg>
  );
}

function Solutions() {
  return (
    <section className="section solutions-section">
      <div className="site-container">
        <div className="section-heading centered">
          <Eyebrow>Our Solutions</Eyebrow>
          <h2>Innovate, Build, and Grow with Confidence</h2>
        </div>

        <div className="solutions-grid">
          {solutions.map((solution, index) => (
            <article className="solution-card" key={index}>
              <div className="solution-card-header">
                <h3>{solution.title}</h3>
                <span>{String(index + 1).padStart(2, "0")}</span>
              </div>
              <div className="solution-card-body">
                <p>{solution.text}</p>
                <ul>
                  {solution.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Work() {
  return (
    <section id="work" className="section work-section">
      <div className="site-container">
        <div className="section-heading">
          <Eyebrow dark>featured Work</Eyebrow>
          <h2>Bringing Ideas to Life</h2>
        </div>

        <div className="work-layout">
          <div className="work-list">
            {work.map((item, index) => (
              <article
                className={index === 0 ? "work-item active" : "work-item"}
                key={item.name}
              >
                <div>
                  <h3>{item.name}</h3>
                  <ul>
                    {item.tags.map((tag) => (
                      <li key={tag}>{tag}</li>
                    ))}
                  </ul>
                </div>
                <a
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary light"
                >
                  See More
                </a>
                <img src={`/assets/images/${item.image}`} alt="" />
              </article>
            ))}
          </div>
          <div className="work-preview">
            <img
              src="/assets/images/circuit.png"
              alt="Circuit project preview"
            />
            <a
              href="https://www.nexubis.io/work/circuit"
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary light"
            >
              See More
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Reviews() {
  return (
    <section className="section reviews-section">
      <div className="site-container">
        <div className="featured-review">
          <div className="review-copy">
            <div className="quote-mark">“</div>
            <p>
              Absolutely thrilled with the website Nexubis crafted for us! Their
              team turned our vision into a stunning reality. Highly
              recommended!
            </p>
            <div>
              <h3>Sean Sanders</h3>
              <span>CEO — Altify</span>
            </div>
          </div>
          <div className="review-media">
            <img src="/assets/images/sean-review.png" alt="Sean Sanders" />
          </div>
        </div>

        <div className="section-heading reviews-heading">
          <Eyebrow>testimonials</Eyebrow>
          <h2>Every company should have the right website partner</h2>
        </div>
      </div>
    </section>
  );
}

function Comparison() {
  const nexubis = [
    "Direct access to multiple specialised skill sets",
    "Dedicated project manager",
    "Dynamic retainers based on client requirements",
    "Daily updates via private client slack channels",
  ];
  const others = [
    "Junior or secretly offshoring work",
    'Tedious "Requests" or Lengthy briefs',
    "Never-ending subscription or long contracts",
    "Slow progress or rushed results",
  ];

  return (
    <section className="section usp-section">
      <div className="site-container">
        <div className="section-heading centered">
          <div className="avatar-stack">
            {[
              "avatar-1.png",
              "avatar-2.png",
              "avatar-4.png",
              "avatar-3.png",
            ].map((avatar) => (
              <img key={avatar} src={`/assets/images/${avatar}`} alt="" />
            ))}
          </div>
          <h2>Limitless Creativity, Powered by a Dedicated Team</h2>
        </div>

        <div className="comparison-card">
          <div className="comparison-column">
            <NexubisLogo className="comparison-logo" />
            <CheckList items={nexubis} red />
          </div>
          <div className="comparison-column">
            <h3>Other agencies</h3>
            <CheckList items={others} />
          </div>
        </div>
      </div>
    </section>
  );
}

function CheckList({ items, red = false }: { items: string[]; red?: boolean }) {
  return (
    <ul className={red ? "check-list red" : "check-list"}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function Steps() {
  return (
    <section className="section steps-section">
      <div className="site-container">
        <div className="section-heading centered">
          <Eyebrow>Process</Eyebrow>
          <h2>Our 4 step plan to a project you’re proud of</h2>
        </div>

        <div className="steps-grid">
          {steps.map((step, index) => (
            <article className="step-card" key={index}>
              <div className="step-card-header">
                <h3>{step.title}</h3>
                <span>{String(index + 1).padStart(2, "0")}</span>
              </div>
              <div className="step-card-body">
                <img
                  className="step-bg"
                  src="/assets/images/card-bg-mark.webp"
                  alt=""
                />
                <img
                  className="step-img"
                  src={`/assets/images/${step.image}`}
                  alt=""
                />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section className="section faq-section">
      <div className="site-container faq-layout">
        <div className="faq-intro">
          <h2>What would you like to know about Nexubis?</h2>
          <p>
            We&apos;re here to help! Explore our FAQs to learn more about our
            services, process, and how we can bring your vision to life.
          </p>
          <div className="faq-actions">
            <Link href="/contact" className="btn btn-primary">
              Get Started
            </Link>
            <a
              href={bookCallUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary"
            >
              Book a Call
            </a>
          </div>
        </div>

        <div className="faq-list">
          {faqs.map(([question, answer], index) => (
            <details key={question} open={index === 0}>
              <summary>
                <span>{question}</span>
                <span className="chevron">⌄</span>
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </div>
      <img className="faq-bg" src="/assets/images/bg-mark.svg" alt="" />
    </section>
  );
}

function CloudCta() {
  return (
    <section className="cloud-cta">
      <div className="site-container">
        <h2>Empowering</h2>
        <h2>Dreams.</h2>
      </div>
      <div className="clouds" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, index) => (
          <img key={index} src="/assets/images/clouds_1.avif" alt="" />
        ))}
      </div>
    </section>
  );
}
