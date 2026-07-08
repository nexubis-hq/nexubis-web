import Link from "next/link";
import { NexubisLogo } from "@/components/NexubisLogo";
import { SCORECARD_URL } from "@/lib/site-config";

// Honest failure state: the link is wrong, expired (reports live 180 days), or
// storage is briefly unavailable. Offer the way back to a fresh check.
export default function ReportNotFound() {
  return (
    <main className="sc-report sc-report-missing">
      <nav className="sc-topbar" aria-label="Report">
        <Link href="/" aria-label="Nexubis home">
          <NexubisLogo className="sc-topbar-logo" />
        </Link>
      </nav>
      <section className="section">
        <div className="site-container sc-missing-body">
          <h1>This report is not here anymore.</h1>
          <p>
            Report links stay live for 180 days. If yours has expired, or the address is not quite right, the quickest fix is to run a
            fresh check. It takes about a minute.
          </p>
          <Link className="btn btn-primary" href={SCORECARD_URL}>
            Run a fresh Credibility Check
          </Link>
        </div>
      </section>
    </main>
  );
}
