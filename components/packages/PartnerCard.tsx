"use client";

// The Partner card: the only tier with prepayment discounts. Reuses the existing
// .package-card look. The billing cycle comes from the page-level toggle (prop), so
// selecting Quarterly or Annually drops Partner's per-month price and shows the
// saving in the green pill. Momentum and Scale stay flat, so this is the only card
// that reacts. Order matches the other cards: name, price, discount, description,
// then the line items (the "Everything in Scale, plus:" lead row).

import Link from "next/link";
import { BOOKING_URL } from "@/lib/site-config";
import { type BillingCycle, type Currency, formatMoney, priceFor, savingFor, tierById } from "@/lib/packages";
import { FeatureRows } from "./FeatureRows";
import { PopularFlame } from "./PopularFlame";

const partner = tierById("partner");

function savingText(currency: Currency, cycle: BillingCycle): string {
  const saving = formatMoney(currency, savingFor(partner, currency, cycle));
  return cycle === "quarterly" ? `Save ${saving} per quarter` : `Save ${saving} per year`;
}

export function PartnerCard({ currency, cycle }: { currency: Currency; cycle: BillingCycle }) {
  const price = priceFor(partner, currency, cycle);
  const discounted = cycle !== "monthly";

  return (
    <article className="package-card package-red package-v2">
      <div className="package-name-row">
        <h4>{partner.name}</h4>
        {partner.highlighted && partner.highlightLabel && (
          <span className="popular-pill">
            <PopularFlame />
            <span>{partner.highlightLabel}</span>
          </span>
        )}
      </div>

      {/* Price and saving share one live region so a cycle change is announced. */}
      <div aria-live="polite">
        <div className="package-price">
          <h2>{formatMoney(currency, price)}</h2>
          <strong>/ month</strong>
        </div>

        {discounted ? (
          <div className="saving package-saving">{savingText(currency, cycle)}</div>
        ) : (
          <div className="saving saving-neutral package-saving">No Discount Applied</div>
        )}
      </div>

      <p className="package-descriptor">{partner.descriptor}</p>

      <FeatureRows features={partner.features} lead={partner.unlockLine} />

      <Link href={BOOKING_URL} className="btn btn-primary package-cta">
        Book a Call
      </Link>
    </article>
  );
}