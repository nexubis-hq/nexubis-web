"use client";

import { useState } from "react";

const faqs = [
  {
    question: "Why does Nexubis use a subscription model instead of hourly billing?",
    answer:
      "We’ve traded timesheets for trust. Our subscription model isn’t just a pricing structure — it’s a mindset shift. We don’t believe in penalizing speed, and we don’t charge more just because we work faster or more efficiently. Traditional hourly billing often rewards slow, bloated workflows. That’s not how we operate. Instead, we focus on delivering high-impact work at a predictable cost - so your team can plan ahead and move fast without watching the clock. The result? Less micromanagement, more momentum.",
  },
  {
    question: "What’s the difference between Nexubis' creative packages?",
    answer:
      "Each package is tailored to match your company’s stage and scale: Momentum is perfect for early-stage startups or lean teams looking to move fast. Scale is built for growing companies that need unlimited requests and deeper collaboration. Flex is fully bespoke — we tailor the team, request flow, and deliverables based on your operations and pace.",
  },
  {
    question: "Is there a cheaper Nexubis plan than the Momentum package?",
    answer:
      "Yes, if Momentum feels like overkill, we can absolutely explore a more tailored solution. If you don’t need access to our full design offering, we can craft a bespoke plan that fits your exact needs and budget. No bloated features. No unnecessary extras. Just what you actually need. And if things ramp up? You can upgrade at any time. Let’s build what makes sense - not what’s just sitting on the shelf.",
  },
  {
    question: "What if my design workload changes month-to-month with Nexubis?",
    answer:
      "We get it — business isn’t always predictable. If you hit a slower month or need to ramp things up beyond what your current package covers, just give us a shout. We’ll adapt your plan to match the pace. That’s where our custom packages come in — designed to flex around your reality, not box you in. We're here to be your sidekick, not a hurdle.",
  },
  {
    question: "What kind of design work does Nexubis include in its subscriptions?",
    answer:
      "Your subscription covers a wide range of creative needs — from product design to brand systems and everything in between.",
  },
  {
    question: "Is Webflow development included in Nexubis design plans?",
    answer:
      "Yes — Webflow is included in all packages. We design, build, and launch directly in your Webflow workspace. We also offer Framer, Headless Shopify solutions, and Figma Sites (coming soon) depending on the technical needs of your project.",
  },
  {
    question: "How do I submit a design request to Nexubis?",
    answer:
      "You can use email — but most clients prefer Slack. We’ll set up a dedicated Slack channel for your company so you have direct access to your full team. This means faster comms, quicker feedback loops, and no bottlenecks.",
  },
  {
    question: "How fast will Nexubis deliver my design requests?",
    answer:
      "Turnaround times depend on complexity — but we typically start within 1 business day. Have something urgent? Flag it, and we’ll prioritize accordingly.",
  },
  {
    question: "What if I need more than one active request with Nexubis at a time?",
    answer:
      "Each team member (Design, Development, or QA) works on one active request at a time — meaning you can run up to 3 active streams simultaneously. Need more? We’ll help you structure a plan that matches your workflow.",
  },
  {
    question: "Do unused Nexubis design requests expire?",
    answer:
      "Nope. As long as your contract is active, unused requests roll over month-to-month. That way, you never lose what you’ve paid for.",
  },
  {
    question: "Can I pause my Nexubis subscription?",
    answer:
      "Absolutely. We get it — sometimes your team needs to slow down, not scale up. If your design needs change, you can pause your subscription at any point. Our billing works on a rolling 31-day cycle. So if you’ve used 21 days and pause, you’ll still have 10 days banked for future use — no time lost, no money wasted. It’s flexibility, built in.",
  },
  {
    question: "Do I keep the design files created by Nexubis?",
    answer:
      "Yes — everything we create is yours. All source files, assets, and final deliverables will be shared via Figma, Webflow, or the format you prefer.",
  },
];

function FaqArrow() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

export function PackagesFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="packages-faq-section section">
      <div className="site-container packages-faq-container">
        <div className="packages-faq-row">
          <aside className="packages-faq-sidebar">
            <h2>Any Questions?</h2>
          </aside>

          <div className="packages-faq-column">
            <div className="packages-faq-group">
              {faqs.map((faq, index) => (
                <details
                  className="packages-faq-item"
                  key={faq.question}
                  open={openIndex === index}
                >
                  <summary
                    className="packages-faq-header"
                    onClick={(event) => {
                      event.preventDefault();
                      setOpenIndex((current) => (current === index ? null : index));
                    }}
                  >
                    <span>{faq.question}</span>
                    <FaqArrow />
                  </summary>
                  <div className="packages-faq-content">
                    <p>{faq.answer}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="packages-faq-mark" aria-hidden="true">
        <img src="/assets/images/bg-mark.svg" alt="" />
      </div>
    </section>
  );
}
