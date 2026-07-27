"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

type Cycle = "monthly" | "quarterly" | "annually";

const plans = [
  {
    name: "Momentum",
    tone: "grey",
    prices: { monthly: "$2 600", quarterly: "$2 340", annually: "$2 166" },
    savings: { monthly: "No Discount Applied", quarterly: "Save $780.00 per quarter", annually: "Save $5 200.00 per year" },
    audience: "For startups & small teams",
    benefits: ["Dedicated creative & technical team", "4 meetings/month", "All design services included", "Daily Slack & Loom communication", "Weekly updates & monthly reports", "30 design requests/month"],
  },
  {
    name: "Scale",
    tone: "red",
    prices: { monthly: "$3 800", quarterly: "$3 420", annually: "$3 166" },
    savings: { monthly: "No Discount Applied", quarterly: "Save $1 140.00 per quarter", annually: "Save $7 600.00 per year" },
    audience: "For growing companies",
    benefits: ["Everything from Momentum, plus:", "Unlimited design requests", "+ 2 alignment meetings", "Faster turnarounds", "Your tasks skip the queue", "Monthly strategy call with our CEO"],
  },
] as const;

const logos = ["altify.svg", "merkle_logo.svg", "cordial-logo.svg", "sofi-logo.svg", "Ox-Logo.svg", "sataya.svg", "oxipack.svg", "ciruit.svg", "blueknight.svg", "usably.svg", "lathyrus.svg", "view-16.svg", "design-focus.svg", "emprise-digital.svg"];

function CheckIcon() {
  return <svg viewBox="0 0 24 25" aria-hidden="true"><path d="M2.5 12.3c0-4.478 0-6.717 1.391-8.108C5.282 2.801 7.522 2.801 12 2.801s6.718 0 8.109 1.391C21.5 5.583 21.5 7.822 21.5 12.3s0 6.718-1.391 8.109C18.718 21.801 16.478 21.801 12 21.801s-6.718 0-8.109-1.392C2.5 19.018 2.5 16.779 2.5 12.3Z"/><path opacity=".4" d="m8 12.801 2.5 2.5 5.5-6"/></svg>;
}

function FlameFallback() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.6 2.5c.4 3.1-1.3 4.5-2.7 5.8-1.2 1.1-2.2 2.1-2.2 3.8 0 1.2.7 2.2 1.7 2.8-.1-1.7.8-3 2.1-4.2.1 2 1.8 2.9 2.5 4.5.8 1.8.1 4-1.5 5.1 3.9-.7 6.3-3.5 6.3-7.2 0-4.4-3.2-8.1-6.2-10.6Z"/><path opacity=".4" d="M7.8 7.8C5.6 9.7 4.2 12 4.2 15a6.8 6.8 0 0 0 6.8 6.8c.9 0 1.8-.2 2.5-.5-3.5-.2-6.1-2.8-6.1-6.2 0-2.5 1.8-4.2.4-7.3Z"/></svg>;
}

function RequestsIcon() {
  return (
    <PackageLottieIcon
      className="requests-icon"
      path="/assets/lotties/PackageInfinity.json"
      fallback={<svg viewBox="-270 -130 540 260" aria-hidden="true"><path d="M0 0C0 0-98.645 100-159.333 100C-220.021 100-245 55.228-245 0C-245-55.229-220.021-100-159.333-100C-98.645-100 0 0 0 0C0 0 98.645 100 159.333 100C220.021 100 245 55.228 245 0C245-55.229 220.021-100 159.333-100C98.645-100 0 0 0 0Z" /></svg>}
    />
  );
}

function PackageLottieIcon({ className, path, fallback }: { className: string; path: string; fallback: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!container || reduceMotion) return;

    let animation: import("lottie-web").AnimationItem | undefined;
    let cancelled = false;

    import("lottie-web").then((module) => {
      if (cancelled || !container) return;
      animation = module.default.loadAnimation({
        autoplay: true,
        container,
        loop: true,
        path,
        renderer: "svg",
      });
      animation.addEventListener("DOMLoaded", () => setLoaded(true));
    });

    return () => {
      cancelled = true;
      animation?.destroy();
    };
  }, [path]);

  return (
    <span className={`package-lottie-icon ${className}`} aria-hidden="true">
      <span className={loaded ? "package-lottie-fallback package-lottie-fallback-hidden" : "package-lottie-fallback"}>{fallback}</span>
      <span className="package-lottie-canvas" ref={containerRef} />
    </span>
  );
}

export function PackagesPricing() {
  const [cycle, setCycle] = useState<Cycle>("annually");
  return (
    <section className="packages-section section">
      <div className="site-container packages-container">
        <div className="packages-heading">
          <a className="google-rating" href="https://www.google.com/search?q=Nexubis+Reviews" target="_blank" rel="noreferrer" aria-label="Nexubis Google reviews">
            <img src="/assets/images/google-rating.svg" alt="Google five-star rating" />
          </a>
          <h1>All-in-One Creative Packages<br/><span>For a Flat Monthly Fee</span></h1>
          <p>No surprises and no strings attached</p>
        </div>

        <div className="billing-selector" role="radiogroup" aria-label="Billing cycle">
          {(["monthly", "quarterly", "annually"] as Cycle[]).map((item) => (
            <button key={item} type="button" className={cycle === item ? "billing-option selected" : "billing-option"} onClick={() => setCycle(item)} role="radio" aria-checked={cycle === item}>
              <span>{item === "annually" ? "Annually" : item[0].toUpperCase() + item.slice(1)}</span>
              {item === "quarterly" && <b>10% Off</b>}
              {item === "annually" && <b>2 Months Free</b>}
            </button>
          ))}
        </div>

        <div className="packages-cards">
          {plans.map((plan) => (
            <article className={`package-card package-${plan.tone}`} key={plan.name}>
              <div className="package-name-row"><h4>{plan.name}</h4>{plan.name === "Scale" && <span className="popular-pill"><PackageLottieIcon className="popular-icon" path="/assets/lotties/PackagePopularFlame.json" fallback={<FlameFallback />} /><span>Popular</span></span>}</div>
              <div className="package-price"><h2>{plan.prices[cycle]}</h2><strong>/month</strong></div>
              <div className={cycle === "monthly" ? "saving saving-neutral" : "saving"}>{plan.savings[cycle]}</div>
              <div className="package-audience">{plan.audience}</div>
              <ul className="package-benefits">
                {plan.benefits.map((benefit, index) => (
                  <li key={benefit} className={index === 0 && plan.name === "Scale" ? "benefit-emphasis" : ""}>
                    {benefit === "Unlimited design requests" ? <RequestsIcon /> : <CheckIcon />}
                    <span>{benefit === "All design services included" ? <Link href="#services">{benefit}</Link> : benefit}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
          <article className="package-card package-flex">
            <h4>Flex</h4>
            <div className="package-price"><h2>Custom</h2></div>
            <div className="saving saving-placeholder">2 Months Free</div>
            <div className="package-audience">For bespoke needs</div>
            <p className="flex-copy">Whether you’re starting small or thinking big, we’ll build a plan that’s shaped around your specific goals.</p>
            <a className="packages-learn-more" href="https://www.nexubis.io/post/the-flex-package" target="_blank" rel="noreferrer">Learn More</a>
          </article>
        </div>
      </div>

      <div className="trusted-logos">
        <p>The trusted design partner for...</p>
        <div className="trusted-logo-row">
          {logos.map((logo) => <div className="trusted-logo" key={logo}><img src={`/assets/images/${logo}`} alt="" /></div>)}
        </div>
      </div>
    </section>
  );
}

const services = [
  "Website Design", "Webflow", "Framer", "Bespoke Development",
  "Custom Integrations", "Pitchdecks", "UI/UX Design", "SEO Optimization",
  "E-Commerce", "Website Maintenance", "2D/3D Animation", "Social Media",
  "Video Production", "Web 3.0", "Brand Strategy & Identity",
  "Creative Direction", "Print Design", "Design Systems", "Copywriting",
];

export function PackagesServices() {
  return (
    <section id="services" className="services-section">
      <div className="services-media" aria-hidden="true">
        <video
          autoPlay
          muted
          loop
          playsInline
          poster="/assets/videos/Website-Packages-video-poster-00001.jpg"
        >
          <source src="/assets/videos/Website-Packages-video-transcode.mp4" type="video/mp4" />
          <source src="/assets/videos/Website-Packages-video-transcode.webm" type="video/webm" />
        </video>
        <div className="services-media-overlay" />
      </div>
      <div className="site-container services-container">
        <h2>Our Services</h2>
        <div className="services-tags">
          {services.map((service) => (
            <div className="services-tag" key={service}>
              <span>{service}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
