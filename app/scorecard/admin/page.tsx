import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, isValidSession, adminConfigured } from "@/lib/scorecard/auth";
import { adminLogin } from "./actions";

export const dynamic = "force-dynamic";

// The admin front door: a signed-in session goes straight to the leads table;
// everyone else gets the password form.
export default async function AdminIndex({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const jar = await cookies();
  if (isValidSession(jar.get(SESSION_COOKIE)?.value)) redirect("/scorecard/admin/leads");
  const { error } = await searchParams;

  return (
    <section className="section">
      <div className="site-container sc-admin-login">
        <h1>Scorecard admin</h1>
        {!adminConfigured() ? (
          <p className="sc-form-error">
            SCORECARD_ADMIN_PASSWORD / SCORECARD_SESSION_SECRET are not set. Configure them in the environment first.
          </p>
        ) : null}
        {error ? <p className="sc-form-error">That password did not match.</p> : null}
        <form action={adminLogin} className="sc-admin-login-form">
          <label className="sc-field">
            <span className="sc-field-label">Password</span>
            <input type="password" name="password" required autoFocus autoComplete="current-password" />
          </label>
          <button className="btn btn-primary" type="submit">
            Sign in
          </button>
        </form>
      </div>
    </section>
  );
}
