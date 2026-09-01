"use client";

// Mobile-only sticky "Jump to" bar: shows the section currently in view and
// opens into the full section list, replicating how the LekkeWeb report's
// sidebar behaves at phone widths. Hidden on desktop (the sticky sidebar owns
// navigation there).
import { useEffect, useRef, useState } from "react";
import type { ReportNavItem } from "./ReportSidebar";

export function JumpToNav({ items }: { items: ReportNavItem[] }) {
  const [active, setActive] = useState<string>(items[0]?.id ?? "");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const els = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => el !== null);
    if (!els.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const inView = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (inView[0]) setActive(inView[0].target.id);
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: 0 },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  useEffect(() => {
    if (!open) return;
    // pointerdown, not click: the opening click's own bubble (or a synthetic
    // double-dispatch) can otherwise close the menu the moment it opens.
    const close = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    // Scrolling away also closes it: the menu is a waypoint, not a modal.
    const onScroll = () => setOpen(false);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", close);
      window.removeEventListener("scroll", onScroll);
    };
  }, [open]);

  const current = items.find((i) => i.id === active) ?? items[0];
  if (!current) return null;

  return (
    <div className="sc-jumpto" ref={rootRef}>
      <button
        type="button"
        className="sc-jumpto-current"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="sc-jumpto-label">Jump to</span>
        <span className="sc-jumpto-section">{current.label}</span>
        <svg className={open ? "sc-jumpto-chevron is-open" : "sc-jumpto-chevron"} viewBox="0 0 12 8" width="12" height="8" aria-hidden="true">
          <path d="M1 1.5 6 6.5 11 1.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? (
        <ul className="sc-jumpto-list">
          {items.map((it) => (
            <li key={it.id}>
              <a
                href={`#${it.id}`}
                className={active === it.id ? "sc-jumpto-link is-active" : "sc-jumpto-link"}
                onClick={() => setOpen(false)}
              >
                <span className={`sc-side-dot sc-side-dot-${it.tone}`} aria-hidden="true" />
                <span>{it.label}</span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
