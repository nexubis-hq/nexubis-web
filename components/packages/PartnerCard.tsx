"use client";

// The Partner card: the only tier with prepayment discounts. Reuses the existing
// .package-card look. The billing cycle comes from the page-level toggle (prop), so
// selecting Quarterly or Annually drops Partner's per-month price and shows the
// saving in the same green pill the site has always used. Momentum and Scale stay
// flat, so this is the only card that reacts. The up-front total, the Partner-only
// note and (yearly) the Scale comparison, the page's strongest argument, sit just
// under the pill, all figures computed from lib/packages.ts.

import Link from "next/link";
import { BOOKING_URL } from "@/lib/site-config";
import { type BillingCycle, type Currency, formatMoney, priceFor, savingFor, tierById, upfrontFor } from "@/lib/packages";
import { FeatureRows } from "./FeatureRows";
import { PopularFlame } from "./PopularFlame";

const partner = tierById("partner");

function savingText(currency: Currency, cycle: BillingCycle): string {
  const saving = formatMoney(currency, savingFor(partner, currency, cycle));
  return cycle === "quarterly" ? `Save ${saving} per quarter` : `Save ${saving} per year`;
}

function contextLine(currency: Currency, cycle: BillingCycle): string {
  const upfront = formatMoney(currency, upfrontFor(partner, currency, cycle) ?? 0);
  const period = cycle === "quarterly" ? "quarter" : "year";
  return `${upfront} billed up front for the ${period}.`;
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

      <p className="package-descriptor">{partner.descriptor}</p>

      {/* Price, saving and context share one live region so a cycle change is
          announced to screen readers. */}
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

        {discounted && <p className="partner-terms">{contextLine(currency, cycle)}</p>}
      </div>

      <p className="benefit-emphasis package-unlock">{partner.unlockLine}</p>
      <FeatureRows features={partner.features} />

      <Link href={BOOKING_URL} className="btn btn-primary package-cta">
        Book an application call
      </Link>
    </article>
  );
}