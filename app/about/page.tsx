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
              <div className="about-eyebrow">
                <span className="about-eyebrow-icon" aria-hidden="true">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="100%"
                    viewBox="0 0 14 14"
                    fill="none"
                    color="red"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M6.71609 5.50909C6.41842 5.36155 6.06888 5.36155 5.77117 5.50909C5.61212 5.5879 5.44205 5.75868 5.30769 5.89363C5.17274 6.02797 5.00196 6.19807 4.92315 6.35709C4.77562 6.65482 4.77562 7.00436 4.92315 7.30203C5.00196 7.46111 5.13807 7.59661 5.27303 7.73096L5.30769 7.76555L10.355 12.8129C10.4893 12.9479 10.6248 13.084 10.7839 13.1628C11.0816 13.3103 11.4311 13.3103 11.7289 13.1628C11.8879 13.084 12.058 12.9132 12.1923 12.7782C12.3273 12.6439 12.498 12.4738 12.5768 12.3148C12.7244 12.0171 12.7244 11.6675 12.5768 11.3698C12.498 11.2108 12.3619 11.0753 12.227 10.9409L7.17961 5.89363L7.14502 5.85898C7.01068 5.72401 6.87517 5.5879 6.71609 5.50909ZM5.92632 6.51255C6.01528 6.42365 6.06923 6.36992 6.11205 6.33166C6.15493 6.28686 6.26757 6.22415 6.37508 6.33166C6.41795 6.36992 6.47191 6.42365 6.56081 6.51255L7.50464 7.45638L6.87015 8.09087L5.92632 7.14704C5.83742 7.05814 5.7837 7.00418 5.74545 6.96131C5.63895 6.85479 5.70108 6.74156 5.74545 6.69828C5.7837 6.65546 5.83742 6.60145 5.92632 6.51255Z"
                      fill="currentColor"
                    />
                    <path
                      opacity="0.4"
                      d="M9.91536 0.730469C10.0984 0.730469 10.2622 0.844452 10.3257 1.01614L10.4976 1.48083C10.737 2.12769 10.8184 2.32083 10.9571 2.45954C11.0959 2.59824 11.289 2.67968 11.9359 2.91904L12.4005 3.09099C12.5722 3.15452 12.6862 3.31823 12.6862 3.5013C12.6862 3.68437 12.5722 3.84808 12.4005 3.91161L11.9359 4.08356C11.289 4.32293 11.0959 4.40437 10.9571 4.54307C10.8184 4.68177 10.737 4.87491 10.4976 5.52178L10.3257 5.98648C10.2622 6.15815 10.0984 6.27214 9.91536 6.27214C9.73231 6.27214 9.56857 6.15815 9.50505 5.98648L9.33308 5.52178C9.09374 4.87491 9.01231 4.68177 8.87359 4.54307C8.73487 4.40437 8.54173 4.32293 7.89487 4.08356L7.43019 3.91161C7.25851 3.84808 7.14453 3.68437 7.14453 3.5013C7.14453 3.31823 7.25851 3.15452 7.43019 3.09099L7.89487 2.91904C8.54173 2.67968 8.73487 2.59824 8.87359 2.45954C9.01231 2.32083 9.09374 2.12769 9.33308 1.48083L9.50505 1.01614C9.56857 0.844452 9.73231 0.730469 9.91536 0.730469Z"
                      fill="currentColor"
                    />
                    <path
                      opacity="0.4"
                      d="M3.5 1.89844C3.68307 1.89844 3.84678 2.01242 3.91031 2.18411L4.03927 2.53262C4.22227 3.02716 4.27552 3.14413 4.35867 3.22728C4.4418 3.31041 4.55878 3.36367 5.05332 3.54666L5.40183 3.67563C5.57352 3.73916 5.6875 3.90287 5.6875 4.08594C5.6875 4.269 5.57352 4.43272 5.40183 4.49625L5.05331 4.62521C4.55878 4.8082 4.4418 4.86146 4.35866 4.9446C4.27552 5.02774 4.22227 5.14472 4.03927 5.63926L3.91031 5.98778C3.84678 6.15945 3.68307 6.27344 3.5 6.27344C3.31693 6.27344 3.15322 6.15945 3.08969 5.98778L2.96073 5.63926C2.77773 5.14472 2.72448 5.02774 2.64133 4.9446C2.5582 4.86146 2.44122 4.8082 1.94668 4.62521L1.59817 4.49625C1.42648 4.43272 1.3125 4.269 1.3125 4.08594C1.3125 3.90287 1.42648 3.73916 1.59817 3.67563L1.94668 3.54666C2.44122 3.36367 2.5582 3.31041 2.64133 3.22727C2.72448 3.14413 2.77773 3.02716 2.96073 2.53262L3.08969 2.18411C3.15322 2.01242 3.31693 1.89844 3.5 1.89844Z"
                      fill="currentColor"
                    />
                  </svg>
                </span>
                <span>Our Values</span>
              </div>
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
