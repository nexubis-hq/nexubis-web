// The pricing block: the existing packages header (Google rating badge, two-line
// heading, subtitle), then the controls row and the three cards. The controls and
// cards are a client island (PricingCards) because they share the billing-cycle
// state. Currency arrives from the page as a prop read from the URL, so figures are
// server-rendered for the current currency and stay shareable.

import { type Currency } from "@/lib/packages";
import { TrustedLogos } from "@/components/TrustedLogos";
import { PricingCards } from "./PricingCards";

export function PricingSection({ currency }: { currency: Currency }) {
  return (
    <section className="packages-section section">
      <div className="site-container packages-container">
        <div className="packages-heading">
          <a
            className="google-rating"
            href="https://www.google.com/search?q=Nexubis+Reviews"
            target="_blank"
            rel="noreferrer"
            aria-label="Nexubis Google reviews"
          >
            <img src="/assets/images/google-rating.svg" alt="Google five-star rating" />
          </a>
          <h1>
            One Creative Team.
            <br />
            <span>One Flat Monthly Fee.</span>
          </h1>
          <p>
            Three levels, one invoice, no per-project quotes.
            <br />
            Start where your problem is. Move up when your ambition does.
          </p>
        </div>

        <PricingCards currency={currency} />
      </div>

      <TrustedLogos />
    </section>
  );
}