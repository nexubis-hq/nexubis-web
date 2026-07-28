"use client";

// Currency preference (EUR / USD), left side of the controls row. Lives in the URL
// (?currency=usd) so the choice is shareable and every server-rendered figure, the
// cards and the FAQ alike, reads the same value. EUR is the default and carries no
// param. Written with router.replace (a soft update, not a reload). No localStorage.

import { useRouter, usePathname } from "next/navigation";
import type { Currency } from "@/lib/packages";

const OPTIONS: Currency[] = ["EUR", "USD"];

export function CurrencyControl({ current }: { current: Currency }) {
  const router = useRouter();
  const pathname = usePathname();

  const select = (next: Currency) => {
    if (next === current) return;
    const href = next === "USD" ? `${pathname}?currency=usd` : pathname;
    router.replace(href, { scroll: false });
  };

  return (
    <div className="pkg-toggle" role="radiogroup" aria-label="Currency">
      {OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={current === option}
          className={current === option ? "pkg-toggle-option selected" : "pkg-toggle-option"}
          onClick={() => select(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}