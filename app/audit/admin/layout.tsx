import type { Metadata } from "next";
import Link from "next/link";
import { NexubisLogo } from "@/components/NexubisLogo";
import { adminLogout } from "./actions";

// The whole admin area is noindex and out of any sitemap. Auth is checked per
// page (the layout renders for the login screen too).
export const metadata: Metadata = {
  title: "Audit admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="sc-admin">
      <nav className="sc-topbar" aria-label="Admin">
        <Link href="/audit/admin/leads" aria-label="Audit admin home">
          <NexubisLogo className="sc-topbar-logo" />
        </Link>
        <div className="sc-admin-nav">
          <Link href="/audit/admin/leads">Leads</Link>
          <Link href="/audit/admin/scans">Scans</Link>
          <form action={adminLogout}>
            <button type="submit" className="sc-admin-linkbtn">
              Sign out
            </button>
          </form>
        </div>
      </nav>
      {children}
    </main>
  );
}
