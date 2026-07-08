"use client";

import { useEffect, useRef } from "react";

/**
 * Renders text as word spans whose color fills in as the block scrolls
 * through the viewport (grey to ink, word by word). Under reduced motion
 * every word is filled immediately and nothing animates on scroll.
 */
export function ScrollFillText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const words = Array.from(
      element.querySelectorAll<HTMLElement>("[data-word]"),
    );

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      words.forEach((word) => word.classList.add("is-filled"));
      return;
    }

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = element.getBoundingClientRect();
      const viewport = window.innerHeight;
      const start = viewport * 0.88;
      const end = viewport * 0.34;
      const progress = Math.min(1, Math.max(0, (start - rect.top) / (start - end)));
      const filled = Math.round(progress * words.length);
      words.forEach((word, index) =>
        word.classList.toggle("is-filled", index < filled),
      );
    };
    const requestUpdate = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <p ref={ref} className={className}>
      {text.split(" ").map((word, index) => (
        <span data-word key={`${word}-${index}`}>
          {word}
          {index < text.split(" ").length - 1 ? " " : ""}
        </span>
      ))}
    </p>
  );
}
