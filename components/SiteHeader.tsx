import Link from "next/link";
import { NexubisLogo } from "@/components/NexubisLogo";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Case Studies", href: "/work" },
  { label: "Packages", href: "/packages" },
  { label: "Dreamlab", href: "/blog" },
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-container nav-container">
        <Link href="/" className="nav-brand" aria-label="Nexubis home">
          <NexubisLogo className="nav-logo" />
        </Link>

        <nav className="nav-menu" aria-label="Main navigation">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="nav-link">
              {link.label}
            </Link>
          ))}
        </nav>

        <Link href="/contact" className="btn btn-primary nav-cta">
          <RocketIcon />
          <span>Get Started</span>
        </Link>

        <button
          className="mobile-menu-button"
          type="button"
          aria-label="Open menu"
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </header>
  );
}

export function RocketIcon() {
  return (
    <svg viewBox="0 0 25 25" aria-hidden="true">
      <path
        d="M23.953 2.02844C23.9002 1.18277 23.2257 0.508858 22.38 0.45664C20.903 0.369058 17.1283 0.50344 13.9955 3.63624L13.3536 4.27935H6.2541C5.80873 4.27831 5.38145 4.45544 5.06745 4.77129L0.945981 8.89156C0.0317591 9.80606 0.450334 11.3673 1.69942 11.7018C1.76495 11.7193 1.83149 11.7329 1.89866 11.7424L6.59365 12.3975L12.0122 17.816L12.6673 22.517C12.85 23.7971 14.35 24.3994 15.3672 23.6011C15.4202 23.5595 15.4705 23.5149 15.5181 23.4673L19.6396 19.3458C19.9553 19.0317 20.1324 18.6045 20.1315 18.1592V11.0561L20.7734 10.4142C23.905 7.27897 24.0406 3.50666 23.953 2.02844ZM1.90586 10.1586C1.87961 10.0739 1.90221 9.98161 1.96465 9.91863L6.08491 5.78876C6.12991 5.74413 6.19073 5.71912 6.2541 5.71916H11.9138L6.67644 10.9553L2.10023 10.317C2.00999 10.3069 1.93399 10.2449 1.90586 10.1586ZM18.6905 18.1556C18.6902 18.2191 18.6648 18.28 18.6197 18.3248L14.5006 22.445C14.3707 22.5764 14.1474 22.5179 14.0986 22.3397C14.0961 22.3305 14.0941 22.3212 14.0927 22.3118L13.4544 17.7332L18.6905 12.4959V18.1556ZM19.7548 9.3967L12.6913 16.459L7.95068 11.7184L15.0142 4.65371C16.9295 2.72609 19.5842 1.72001 22.296 1.89406C22.4152 1.90404 22.5089 2.00023 22.5156 2.11963C22.6879 4.82938 21.682 7.48159 19.756 9.3955L19.7548 9.3967ZM9.3317 19.1946C8.81337 20.3381 7.06759 22.997 2.13263 22.997C1.73505 22.9969 1.41272 22.6746 1.41272 22.277C1.41272 17.3421 4.07158 15.5963 5.21503 15.078C5.71934 14.8471 6.2845 15.2487 6.23232 15.8009C6.2081 16.0571 6.04901 16.281 5.81495 16.3882C4.97507 16.7685 3.1117 18.0104 2.87893 21.5367C6.40528 21.304 7.64712 19.4346 8.02747 18.6007C8.25838 18.0964 8.94863 18.0312 9.26992 18.4833C9.41903 18.6931 9.44487 18.9666 9.3377 19.2006L9.3317 19.1946Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="0.2"
      />
    </svg>
  );
}
