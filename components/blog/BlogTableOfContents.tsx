"use client";

import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import type { TableOfContentsItem } from "@/lib/blog/sanitize-post-html";
import styles from "./BlogPost.module.css";

type BlogTableOfContentsProps = {
  items: TableOfContentsItem[];
};

export function BlogTableOfContents({ items }: BlogTableOfContentsProps) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");
  const scrollOffset = 112;

  useEffect(() => {
    if (items.length === 0) return;

    const headings = items
      .map((item) => document.getElementById(item.id))
      .filter((heading): heading is HTMLElement => Boolean(heading));

    if (headings.length === 0) return;

    const updateActiveHeading = () => {
      const current = headings.reduce((active, heading) => {
        if (heading.getBoundingClientRect().top <= scrollOffset) return heading;
        return active;
      }, headings[0]);

      setActiveId(current.id);
    };

    const observer = new IntersectionObserver(updateActiveHeading, {
      rootMargin: "-96px 0px -65% 0px",
      threshold: [0, 1],
    });

    headings.forEach((heading) => observer.observe(heading));
    updateActiveHeading();

    window.addEventListener("scroll", updateActiveHeading, { passive: true });
    window.addEventListener("resize", updateActiveHeading);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", updateActiveHeading);
      window.removeEventListener("resize", updateActiveHeading);
    };
  }, [items]);

  const scrollToHeading = (id: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    const heading = document.getElementById(id);
    if (!heading) return;

    event.preventDefault();
    const top = heading.getBoundingClientRect().top + window.scrollY - scrollOffset;
    window.scrollTo({ top, behavior: "smooth" });
    window.history.replaceState(null, "", `#${id}`);
    setActiveId(id);
  };

  if (items.length === 0) return null;

  return (
    <aside className={styles.sidebar} aria-label="Article table of contents">
      <ul className={styles.tocList}>
        {items.map((item) => (
          <li key={item.id} className={styles.tocItem}>
            <a
              className={activeId === item.id ? styles.tocLinkActive : styles.tocLink}
              data-level={item.level}
              href={`#${item.id}`}
              onClick={scrollToHeading(item.id)}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}
