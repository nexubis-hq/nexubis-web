"use client";

const logos = [
  { file: "altify.svg", href: "https://altify.app/" },
  { file: "merkle_logo.svg", href: "https://www.merklescience.com/" },
  { file: "cordial-logo.svg", href: "https://cordialsystems.com/" },
  { file: "sofi-logo.svg", href: "https://www.sofi.com/" },
  { file: "Ox-Logo.svg", href: "https://www.ox.security/" },
  { file: "sataya.svg", href: "https://sataya.io/" },
  { file: "oxipack.svg", href: "https://www.oxipack.com/" },
  { file: "ciruit.svg", href: "https://circuitprotect.com/" },
  { file: "blueknight.svg", href: "https://www.blueknight.io/" },
  { file: "usably.svg", href: "https://www.usably.studio/" },
  { file: "lathyrus.svg", href: "https://www.lathyrus.io/" },
  { file: "view-16.svg", href: "https://www.lathyrus.io/" },
  { file: "design-focus.svg", href: "https://www.designfocus.io/" },
  { file: "emprise-digital.svg", href: "https://www.emprise.co.za/" },
] as const;

export function TrustedLogos({ className = "" }: { className?: string }) {
  return (
    <div className={`trusted-logos ${className}`.trim()}>
      <p>The trusted design partner for...</p>
      <div className="trusted-logo-row">
        {[...logos, ...logos].map((logo, index) => (
          <a
            className="trusted-logo"
            href={logo.href}
            target="_blank"
            rel="noreferrer"
            key={`${logo.file}-${index}`}
            aria-label={`Visit ${new URL(logo.href).hostname.replace(/^www\./, "")}`}
          >
            <img src={`/assets/images/${logo.file}`} alt="" />
          </a>
        ))}
      </div>
    </div>
  );
}
