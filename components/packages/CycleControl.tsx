"use client";

// Billing-cycle toggle, right side of the controls row. Reuses the existing
// .billing-selector / .billing-option styling verbatim (including the "10% Off" and
// "2 Months Free" badges and the red selected state) so it looks exactly like the
// control that was here before. The badges are the Partner prepayment rates; the
// "No Discount Applied" pill on Momentum and Scale makes clear those stay flat.

import type { BillingCycle } from "@/lib/packages";

const OPTIONS: { id: BillingCycle; label: string; badge?: string }[] = [
  { id: "monthly", label: "Monthly" },
  { id: "quarterly", label: "Quarterly", badge: "10% Off" },
  { id: "yearly", label: "Annually", badge: "2 Months Free" },
];

export function CycleControl({ cycle, onChange }: { cycle: BillingCycle; onChange: (next: BillingCycle) => void }) {
  return (
    <div className="billing-selector" role="radiogroup" aria-label="Billing cycle">
      {OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={cycle === option.id}
          className={cycle === option.id ? "billing-option selected" : "billing-option"}
          onClick={() => onChange(option.id)}
        >
          <span>{option.label}</span>
          {option.badge && <b>{option.badge}</b>}
        </button>
      ))}
    </div>
  );
}