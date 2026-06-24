import Link from "next/link";
import { NexubisLogo } from "@/components/NexubisLogo";

const footerLinks = [
  { label: "Work", href: "/#work" },
  { label: "Contact", href: "/contact" },
  { label: "Packages", href: "/packages" },
];

const socialLinks = [
  { label: "Instagram", href: "https://www.instagram.com/nexubis.design/" },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/nexubis/" },
  { label: "Threads", href: "https://www.threads.net/@nexubis.design" },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-container footer-inner">
        <div className="footer-wordmark" aria-hidden="true">
          nexubis
        </div>

        <div className="footer-bottom">
          <div>
            <NexubisLogo className="footer-logo" />
          </div>
          <div className="footer-menus">
            <ul>
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
            <ul>
              {socialLinks.map((link) => (
                <li key={link.href}>
                  <a href={link.href} target="_blank" rel="noreferrer">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <p className="copyright">
            © 2025 — Nexubis Pty Ltd. All rights reserved.
          </p>
        </div>
      </div>

      <div className="footer-media" aria-hidden="true">
        <img src="/assets/images/footer-img-2.webp" alt="" />
        <img src="/assets/images/footer-img-3.webp" alt="" />
        <img src="/assets/images/footer-img-1.webp" alt="" />
      </div>
    </footer>
  );
}
