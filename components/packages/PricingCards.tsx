"use client";

// Client wrapper holding the page-level billing cycle so both the toggle and the
// cards share it. Currency arrives from the page as a prop (read from the URL).
// Momentum and Scale are flat rates: their price never changes and they always show
// "No Discount Applied". Only Partner responds to the cycle, with its price and a
// green saving pill.

import { useState } from "react";
import { type BillingCycle, type Currency, tierById } from "@/lib/packages";
import { CurrencyControl } from "./CurrencyControl";
import { CycleControl } from "./CycleControl";
import { StaticTierCard } from "./StaticTierCard";
import { PartnerCard } from "./PartnerCard";

export function PricingCards({ currency }: { currency: Currency }) {
  // Annually is pre-selected on landing, as on the original page, so the strongest
  // Partner saving is the first thing a visitor sees.
  const [cycle, setCycle] = useState<BillingCycle>("yearly");

  return (
    <>
      <div className="pkg-controls">
        <CurrencyControl current={currency} />
        <CycleControl cycle={cycle} onChange={setCycle} />
      </div>

      <div className="packages-cards">
        <StaticTierCard tier={tierById("momentum")} currency={currency} tone="grey" />
        <StaticTierCard tier={tierById("scale")} currency={currency} tone="grey" />
        <PartnerCard currency={currency} cycle={cycle} />
      </div>
    </>
  );
}