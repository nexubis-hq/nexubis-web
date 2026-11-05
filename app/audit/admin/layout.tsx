import "./admin-polish.css";
import type { Metadata } from "next";
import Link from "next/link";
import { NexubisLogo } from "@/components/NexubisLogo";
import { cookies } from "next/headers";
import { SESSION_COOKIE, isValidSession } from "@/lib/scorecard/auth";
import { adminLogout } from "./actions";

// The whole admin area is noindex and out of any sitemap. Auth is checked per
// page (the layout renders for the login screen too).
export const metadata: Metadata = {
  title: "Audit admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The admin menu only shows once signed in; the login screen gets the logo alone.
  const signedIn = isValidSession((await cookies()).get(SESSION_COOKIE)?.value);
  return (
    <main className="sc-admin">
      <nav className="sc-topbar sc-admin-topbar" aria-label="Admin">
        <Link href="/audit/admin/leads" aria-label="Audit admin home">
          <NexubisLogo className="sc-topbar-logo" />
        </Link>
        {signedIn ? (
          <div className="sc-admin-nav">
            <Link href="/audit/admin/leads">Leads</Link>
            <Link href="/audit/admin/scans">Activity</Link>
            <Link href="/audit/admin/manual">Manual audit</Link>
            <form action={adminLogout}>
              <button type="submit" className="sc-admin-linkbtn">
                Sign out
              </button>
            </form>
          </div>
        ) : null}
      </nav>
      {children}
    </main>
  );
}
