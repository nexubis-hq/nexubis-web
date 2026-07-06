"use client";

import Link from "next/link";
import { useState } from "react";

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

export function PackagesPricing() {
  const [cycle, setCycle] = useState<Cycle>("annually");
  return (
    <section className="packages-section section">
      <div className="site-container packages-container">
        <div className="packages-heading">
          <a className="google-rating" href="https://www.google.com/search?q=Nexubis+Reviews" target="_blank" rel="noreferrer" aria-label="Nexubis Google reviews">
            <span className="google-word">Google</span><span className="google-stars">★★★★★</span>
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
              <div className="package-name-row"><h4>{plan.name}</h4>{plan.name === "Scale" && <span className="popular-pill">Popular</span>}</div>
              <div className="package-price"><h2>{plan.prices[cycle]}</h2><strong>/month</strong></div>
              <div className={cycle === "monthly" ? "saving saving-neutral" : "saving"}>{plan.savings[cycle]}</div>
              <div className="package-audience">{plan.audience}</div>
              <ul className="package-benefits">
                {plan.benefits.map((benefit, index) => <li key={benefit} className={index === 0 && plan.name === "Scale" ? "benefit-emphasis" : ""}><CheckIcon/><span>{benefit === "All design services included" ? <Link href="#services">{benefit}</Link> : benefit}</span></li>)}
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
