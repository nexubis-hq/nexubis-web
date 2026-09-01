"use client";

// The report's sticky sidebar: an "On this page" nav that tracks the section in
// view (IntersectionObserver, so it stays honest as the reader scrolls), plus
// Laine's book-a-call card. Desktop only; on mobile the report is a single
// scroll and the next-step section carries the CTA. Client component: the active
// state and the observer need the browser.
import { useEffect, useState } from "react";
import { BookCallButton } from "./BookCallButton";

export type SectionTone = "good" | "mid" | "poor" | "neutral";
export interface ReportNavItem {
  id: string;
  label: string;
  tone: SectionTone;
}

export function ReportSidebar({
  items,
  company,
  contactName,
}: {
  items: ReportNavItem[];
  company: string;
  contactName?: string;
}) {
  const [active, setActive] = useState<string>(items[0]?.id ?? "");

  useEffect(() => {
    const els = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => el !== null);
    if (!els.length) return;
    // A band across the upper-middle of the viewport decides "current": the
    // topmost section intersecting it wins, so the highlight advances as each
    // heading reaches reading height.
    const observer = new IntersectionObserver(
      (entries) => {
        const inView = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (inView[0]) setActive(inView[0].target.id);
      },
      { rootMargin: "-25% 0px -60% 0px", threshold: 0 },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  return (
    <aside className="sc-side" aria-label="On this page">
      <nav className="sc-side-nav">
        <p className="sc-side-title">On this page</p>
        <ul>
          {items.map((it) => (
            <li key={it.id}>
              <a href={`#${it.id}`} className={active === it.id ? "sc-side-link is-active" : "sc-side-link"}>
                <span className={`sc-side-dot sc-side-dot-${it.tone}`} aria-hidden="true" />
                <span>{it.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sc-side-cta">
        <div className="sc-side-cta-head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="sc-side-avatar"
            src="/assets/images/laine-p-500.png"
            alt="Laine du Toit"
            width={52}
            height={52}
            loading="lazy"
          />
          <div className="sc-side-cta-person">
            <span className="sc-side-cta-name">Laine du Toit</span>
            <span className="sc-side-cta-role">Chief Operations Officer</span>
          </div>
        </div>
        <p className="sc-side-cta-copy">Book a call and we&rsquo;ll walk your audit together, no obligation.</p>
        <BookCallButton className="btn btn-primary sc-side-cta-btn" personName={contactName} business={company}>
          Book your free call
        </BookCallButton>
      </div>
    </aside>
  );
}
