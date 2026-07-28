// Under the cards: three slim reassurance items and a closing call to book. Plain,
// no card treatment, no icons. Copy is verbatim and the commitment line is the
// whole of it: no refund terms, no minimum period, no auto-renewal, by design.

import Link from "next/link";
import { BOOKING_URL } from "@/lib/site-config";

const ITEMS = [
  {
    title: "One invoice, one team.",
    body: "No per-project quotes, no surprise costs, no five suppliers to chase.",
  },
  {
    title: "Two months' notice.",
    body: "That is the whole commitment. When you want to stop, tell us two months ahead and we hand the work over properly.",
  },
  {
    title: "Not sure which fits?",
    body: "Book an application call and we will tell you honestly, including if the answer is not yet.",
  },
];

export function ReassuranceBand() {
  return (
    <section className="pkg-reassure section">
      <div className="site-container">
        <div className="pkg-reassure-row">
          {ITEMS.map((item) => (
            <div className="pkg-reassure-item" key={item.title}>
              <p className="pkg-reassure-title">{item.title}</p>
              <p className="pkg-reassure-body">{item.body}</p>
            </div>
          ))}
        </div>
        <div className="pkg-reassure-cta">
          <Link href={BOOKING_URL} className="btn btn-primary">
            Book an application call
          </Link>
        </div>
      </div>
    </section>
  );
}