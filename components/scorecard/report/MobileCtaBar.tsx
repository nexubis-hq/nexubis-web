// Mobile-only sticky bottom bar: one line of copy plus the unlock-session
// button, always in reach while the report scrolls (the LekkeWeb pattern).
// Hidden on desktop, where the sidebar card carries the CTA.
import { BookCallButton } from "./BookCallButton";

export function MobileCtaBar({ company, contactName }: { company: string; contactName?: string }) {
  return (
    <div className="sc-mobile-cta" role="complementary" aria-label="Your next step">
      <p>Unlock a live session and we&rsquo;ll walk your audit together.</p>
      <BookCallButton className="btn btn-primary sc-mobile-cta-btn" personName={contactName} business={company}>
        Unlock your session
      </BookCallButton>
    </div>
  );
}
