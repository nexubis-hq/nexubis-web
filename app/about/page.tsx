import type { Metadata } from "next";
import { AboutReel } from "@/components/AboutReel";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

const SITE_URL = "https://www.nexubis.io";

const stats = [
  {
    value: "80M+",
    label: "Users interacting with Nexubis-designed experiences",
  },
  {
    value: "3× faster",
    label: "Design-to-development handoff using our systems",
  },
  {
    value: "99.9%",
    label: "Uptime across production deployments",
  },
  {
    value: "45+",
    label: "Complex products launched without replatforming",
  },
] as const;

const values = [
  {
    title: "Design",
    body: "Design should be beautiful—and intentional. Every interface, graphic, and interaction we create starts with understanding your users and your goals.",
  },
  {
    title: "Innovation",
    body: "The best outcomes come from working together. We listen, challenge assumptions, and iterate with transparency to deliver solutions that make an impact.",
  },
  {
    title: "Collaboration",
    body: "We pair creative vision with rigorous development standards. Your final product is built for performance, reliability, and long-term growth — not just launch day.",
  },
] as const;

const team = [
  {
    name: "Hannes",
    role: "Founder & CEO",
    image: "/assets/images/haness.png",
  },
  {
    name: "Laine",
    role: "Chief Operations Officer",
    image: "/assets/images/laine.png",
  },
  {
    name: "Camryn",
    role: "Operations Manager",
    image: "/assets/images/cami.png",
  },
  {
    name: "Suné",
    role: "Digital Product & Success Lead",
    image: "/assets/images/sune.png",
  },
  {
    name: "Sam",
    role: "Chief Technology Officer",
    image: "/assets/images/sam.png",
  },
  {
    name: "Shannah",
    role: "Software Developer",
    image: "/assets/images/shannah.png",
  },
  {
    name: "Chloe",
    role: "Graphic and Web Designer",
    image: "/assets/images/chloe.png",
  },
] as const;

export const metadata: Metadata = {
  title: "About Nexubis",
  description:
    "We’re your strategic partner in building brands, products, and digital platforms that perform.",
  alternates: {
    canonical: `${SITE_URL}/about`,
  },
  openGraph: {
    title: "About Nexubis",
    description:
      "We’re your strategic partner in building brands, products, and digital platforms that perform.",
    url: `${SITE_URL}/about`,
  },
  twitter: {
    title: "About Nexubis",
    description:
      "We’re your strategic partner in building brands, products, and digital platforms that perform.",
  },
};

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main className="about-page">
        <section className="about-hero-section">
          <div className="site-container">
            <div className="about-hero-copy">
              <h1>
                <span>Crafting Digital Experiences</span> That Drive Growth
              </h1>
              <p>
                At Nexubis, we’re more than just a design and development team — we’re
                your strategic partner in building brands, products, and digital
                platforms that perform. From startup to enterprise, we help ambitious
                companies innovate, connect with audiences, and scale with confidence.
              </p>
            </div>

            <div className="about-stats-grid">
              {stats.map((stat) => (
                <div className="about-stat" key={stat.value}>
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="about-reel">
            <AboutReel />
          </div>
        </section>

        <section className="about-values-section">
          <div className="site-container">
            <div className="about-values-heading">
              <div className="about-eyebrow">Our Values</div>
              <h2>
                At the heart of our work lies a dedication to creativity,
                authenticity, and excellence.
              </h2>
            </div>

            <div className="about-values-grid">
              {values.map((value) => (
                <article className="about-value-card" key={value.title}>
                  <h3>{value.title}</h3>
                  <p>{value.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="about-team-section">
          <div className="site-container">
            <div className="about-team-heading">
              <h2>Unlimited creative output and a dedicated creative team</h2>
            </div>

            <div className="about-team-grid">
              {team.map((person) => (
                <article className="about-team-card" key={person.name}>
                  <div className="about-team-card-copy">
                    <h3>{person.name}</h3>
                    <p>{person.role}</p>
                  </div>
                  <img
                    className="about-team-mark"
                    src="/assets/images/bg-mark-white.svg"
                    alt=""
                  />
                  <img
                    className="about-team-photo"
                    src={person.image}
                    alt=""
                    width="1024"
                    height="1024"
                  />
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
