// Mobile-only sticky bottom bar: one line of copy plus the book-a-call
// button, always in reach while the report scrolls (the LekkeWeb pattern).
// Hidden on desktop, where the sidebar card carries the CTA.
import { BookCallButton } from "./BookCallButton";

export function MobileCtaBar({ company, contactName }: { company: string; contactName?: string }) {
  return (
    <div className="sc-mobile-cta" role="complementary" aria-label="Book a call">
      <p>Book a call and we&rsquo;ll walk your audit together.</p>
      <BookCallButton className="btn btn-primary sc-mobile-cta-btn" personName={contactName} business={company}>
        Book a call
      </BookCallButton>
    </div>
  );
}
