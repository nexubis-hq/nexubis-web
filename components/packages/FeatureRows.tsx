// The six feature rows shared by every tier card. Reuses the existing
// .package-benefits list styling so the cards look exactly like the current site;
// the only addition per row is the InfoTip, which carries the detail that would
// otherwise need a comparison table. One identical check icon on every row.
// Isomorphic: rendered on the server (Momentum, Scale) and in the client Partner
// card alike.

import type { Feature } from "@/lib/packages";
import { InfoTip } from "@/components/ui/InfoTip";

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 25" aria-hidden="true">
      <path d="M2.5 12.3c0-4.478 0-6.717 1.391-8.108C5.282 2.801 7.522 2.801 12 2.801s6.718 0 8.109 1.391C21.5 5.583 21.5 7.822 21.5 12.3s0 6.718-1.391 8.109C18.718 21.801 16.478 21.801 12 21.801s-6.718 0-8.109-1.392C2.5 19.018 2.5 16.779 2.5 12.3Z" />
      <path opacity=".4" d="m8 12.801 2.5 2.5 5.5-6" />
    </svg>
  );
}

export function FeatureRows({ features }: { features: Feature[] }) {
  return (
    <ul className="package-benefits">
      {features.map((feature) => (
        <li key={feature.label}>
          <CheckIcon />
          <span className="benefit-label">{feature.label}</span>
          <InfoTip label={feature.label} tip={feature.tip} />
        </li>
      ))}
    </ul>
  );
}