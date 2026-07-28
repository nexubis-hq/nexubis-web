// Momentum and Scale: flat monthly rate, no cycle block. Server-rendered.
// Reuses the existing .package-card look (grey Momentum, red-bordered Scale) so
// the cards match the current site. Scale carries the "Most chosen" pill where the
// old page put "Popular". Neither card renders a savings line or a placeholder:
// there is no page-level cycle control to explain, so silence is correct.

import Link from "next/link";
import { BOOKING_URL } from "@/lib/site-config";
import { type Currency, type Tier, formatMoney } from "@/lib/packages";
import { FeatureRows } from "./FeatureRows";
import { PopularFlame } from "./PopularFlame";

export function StaticTierCard({
  tier,
  currency,
  tone,
}: {
  tier: Tier;
  currency: Currency;
  tone: "grey" | "red";
}) {
  const ctaClass = tier.highlighted ? "btn btn-primary package-cta" : "btn btn-secondary package-cta";

  return (
    <article className={`package-card package-${tone} package-v2`}>
      <div className="package-name-row">
        <h4>{tier.name}</h4>
        {tier.highlighted && tier.highlightLabel && (
          <span className="popular-pill">
            <PopularFlame />
            <span>{tier.highlightLabel}</span>
          </span>
        )}
      </div>

      <p className="package-descriptor">{tier.descriptor}</p>

      <div className="package-price">
        <h2>{formatMoney(currency, tier.monthly[currency])}</h2>
        <strong>/ month</strong>
      </div>
      {/* Flat rate: no prepayment discount at any cycle, stated plainly. */}
      <div className="saving saving-neutral package-saving">No Discount Applied</div>

      <p className="benefit-emphasis package-unlock">{tier.unlockLine}</p>
      <FeatureRows features={tier.features} />

      <Link href={BOOKING_URL} className={ctaClass}>
        Book an application call
      </Link>
    </article>
  );
}