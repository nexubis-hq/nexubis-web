import type { Metadata } from "next";
import { ContactTabs } from "@/components/ContactTabs";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { TrustedLogos } from "@/components/TrustedLogos";

export const metadata: Metadata = {
  title: "Nexubis - Contact Us",
  description:
    "Looking for a full-stack design and development partner? Let's talk. We help founders and teams turn bold visions into reality - empowering your dreams with real-world execution.",
  openGraph: {
    title: "Nexubis - Contact Us",
    description:
      "Looking for a full-stack design and development partner? Let's talk. We help founders and teams turn bold visions into reality - empowering your dreams with real-world execution.",
    type: "website",
    url: "https://www.nexubis.io/contact",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nexubis - Contact Us",
    description:
      "Looking for a full-stack design and development partner? Let's talk. We help founders and teams turn bold visions into reality - empowering your dreams with real-world execution.",
  },
  alternates: {
    canonical: "https://www.nexubis.io/contact",
  },
};

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main className="contact-page-main">
        <section className="contact-section section">
          <div className="site-container contact-container">
            <div className="contact-heading">
              <h1>Get in Touch.</h1>
            </div>
            <ContactTabs />
          </div>
          <TrustedLogos className="contact-trusted-logos" />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
