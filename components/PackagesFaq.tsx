"use client";

// The packages FAQ. Keeps the existing single-open accordion behaviour, layout and
// styling; only the content changed. Both the visible accordion and the FAQPage
// JSON-LD come from the SAME export (getPackagesFaq), so the structured data can
// never drift from what a reader sees, and A1's prices are computed from
// lib/packages.ts. Every answer is present in the server-rendered DOM (details
// always renders its children), so crawlers see every answer without a click.
// Headings are real: the section h2 and an h3 per question.

import { useState } from "react";
import { type Currency } from "@/lib/packages";
import { getPackagesFaq } from "@/lib/packages-faq";

function FaqArrow() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

export function PackagesFaq({ currency }: { currency: Currency }) {
  const faqs = getPackagesFaq(currency);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };

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
                <details className="packages-faq-item" key={faq.q} open={openIndex === index}>
                  <summary
                    className="packages-faq-header"
                    onClick={(event) => {
                      event.preventDefault();
                      setOpenIndex((current) => (current === index ? null : index));
                    }}
                  >
                    <h3 className="packages-faq-q">{faq.q}</h3>
                    <FaqArrow />
                  </summary>
                  <div className="packages-faq-content" role="region" aria-label={faq.q}>
                    <p>{faq.a}</p>
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

      <script
        type="application/ld+json"
        // Generated from the same faqs array as the accordion above. The escape
        // keeps a stray "<" from ever closing the script early.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
    </section>
  );
}