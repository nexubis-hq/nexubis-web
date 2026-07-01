"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import { NexubisLogo } from "@/components/NexubisLogo";

const caseStudies = [
  { label: "Circuit", href: "https://www.nexubis.io/work/circuit" },
  { label: "Oxipack", href: "https://www.nexubis.io/work/oxipack" },
  { label: "Altify", href: "https://www.nexubis.io/work/altify" },
];

const desktopLinks = [
  { label: "Packages", href: "https://www.nexubis.io/packages", icon: "wallet" },
  { label: "Dreamlab", href: "https://www.nexubis.io/blog", icon: "flask" },
];

const mobileLinks = [
  { label: "Home", href: "/", icon: "home" },
  { label: "Dreamlab", href: "https://www.nexubis.io/blog", icon: "flask" },
  { label: "Pricing", href: "https://www.nexubis.io/packages", icon: "wallet" },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [desktopDropdownOpen, setDesktopDropdownOpen] = useState(false);
  const [mobileSubmenuOpen, setMobileSubmenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  const closeMenus = () => {
    setMenuOpen(false);
    setDesktopDropdownOpen(false);
    setMobileSubmenuOpen(false);
  };

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) closeMenus();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenus();
    };
    const onResize = () => closeMenus();

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <header className="site-header" ref={headerRef}>
      <div className="site-container nav-container">
        <Link href="/" className="nav-brand" aria-label="Nexubis home">
          <NexubisLogo className="nav-logo" />
        </Link>

        <nav
          id="main-navigation"
          className="nav-menu"
          aria-label="Main navigation"
        >
          <div className="nav-menu-links">
            <div
              className="desktop-case-studies"
              onMouseEnter={() => setDesktopDropdownOpen(true)}
              onMouseLeave={() => setDesktopDropdownOpen(false)}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  setDesktopDropdownOpen(false);
                }
              }}
            >
              <button
                className="nav-link desktop-dropdown-toggle"
                type="button"
                aria-expanded={desktopDropdownOpen}
                aria-controls="desktop-case-studies-menu"
                onClick={() => setDesktopDropdownOpen((open) => !open)}
              >
                <NavIcon type="grid" />
                <span>Case Studies</span>
                <NavArrow />
              </button>
              <div
                className={
                  desktopDropdownOpen
                    ? "desktop-dropdown desktop-dropdown-open"
                    : "desktop-dropdown"
                }
                id="desktop-case-studies-menu"
              >
                {caseStudies.map((item) => (
                  <Link key={item.href} href={item.href} onClick={closeMenus}>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            {desktopLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="nav-link"
                onClick={closeMenus}
              >
                <NavIcon type={link.icon} />
                <span>{link.label}</span>
              </Link>
            ))}
          </div>

          <Link
            href="https://www.nexubis.io/contact"
            className="btn btn-primary nav-cta rocket-button"
            onClick={closeMenus}
          >
            <span className="nav-cta-icon rocket-button-icon">
              <RocketIcon />
            </span>
            <span className="nav-cta-text rocket-button-text">Get Started</span>
          </Link>

          <button
            className="mobile-menu-button"
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-controls="mobile-navigation"
            aria-expanded={menuOpen}
            onClick={() => {
              setMenuOpen((open) => !open);
              setMobileSubmenuOpen(false);
            }}
          >
            <span />
            <span />
            <span />
          </button>
        </nav>
      </div>

      <nav
        id="mobile-navigation"
        className={menuOpen ? "mobile-nav-panel mobile-nav-panel-open" : "mobile-nav-panel"}
        aria-label="Mobile navigation"
        aria-hidden={!menuOpen}
      >
        <div className="mobile-nav-list">
          {mobileLinks.map((link) => (
            <Fragment key={link.href}>
              <Link href={link.href} className="mobile-nav-link" onClick={closeMenus}>
                <NavIcon type={link.icon} />
                <span>{link.label}</span>
              </Link>
              <span className="mobile-nav-divider" aria-hidden="true" />
            </Fragment>
          ))}
          <div className="mobile-case-studies">
            <button
              className="mobile-nav-link mobile-submenu-toggle"
              type="button"
              aria-expanded={mobileSubmenuOpen}
              aria-controls="mobile-case-studies-menu"
              onClick={() => setMobileSubmenuOpen((open) => !open)}
            >
              <NavIcon type="grid" />
              <span>Case Studies</span>
              <NavArrow />
            </button>
            <div
              className={
                mobileSubmenuOpen
                  ? "mobile-submenu mobile-submenu-open"
                  : "mobile-submenu"
              }
              id="mobile-case-studies-menu"
            >
              {[caseStudies[2], caseStudies[0], caseStudies[1]].map((item) => (
                <Link key={item.href} href={item.href} onClick={closeMenus}>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}

function NavIcon({ type }: { type: string }) {
  if (type === "home") {
    return (
      <svg className="nav-link-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 18V15" />
        <path d="M10.0732 2.81985L3.14319 8.36985C2.36319 8.98985 1.86319 10.2998 2.03319 11.2798L3.36319 19.2398C3.60319 20.6598 4.96319 21.8098 6.40319 21.8098H17.6032C19.0332 21.8098 20.4032 20.6498 20.6432 19.2398L21.9732 11.2798C22.1332 10.2998 21.6332 8.98985 20.8632 8.36985L13.9332 2.82985C12.8632 1.96985 11.1332 1.96985 10.0732 2.81985Z" />
      </svg>
    );
  }

  if (type === "grid") {
    return (
      <svg className="nav-link-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M17 10H19C21 10 22 9 22 7V5C22 3 21 2 19 2H17C15 2 14 3 14 5V7C14 9 15 10 17 10Z" />
        <path d="M5 22H7C9 22 10 21 10 19V17C10 15 9 14 7 14H5C3 14 2 15 2 17V19C2 21 3 22 5 22Z" />
        <path opacity="0.34" d="M6 10C8.20914 10 10 8.20914 10 6C10 3.79086 8.20914 2 6 2C3.79086 2 2 3.79086 2 6C2 8.20914 3.79086 10 6 10Z" />
        <path opacity="0.34" d="M18 22C20.2091 22 22 20.2091 22 18C22 15.7909 20.2091 14 18 14C15.7909 14 14 15.7909 14 18C14 20.2091 15.7909 22 18 22Z" />
      </svg>
    );
  }

  if (type === "wallet") {
    return (
      <svg className="nav-link-icon" viewBox="0 0 24 25" fill="none" aria-hidden="true">
        <path d="M18.04 13.9504C17.62 14.3604 17.38 14.9504 17.44 15.5804C17.53 16.6604 18.52 17.4504 19.6 17.4504H21.5V18.6404C21.5 20.7104 19.81 22.4004 17.74 22.4004H6.26C4.19 22.4004 2.5 20.7104 2.5 18.6404V11.9104C2.5 9.8404 4.19 8.15039 6.26 8.15039H17.74C19.81 8.15039 21.5 9.8404 21.5 11.9104V13.3504H19.48C18.92 13.3504 18.41 13.5704 18.04 13.9504Z" />
        <path d="M2.5 12.8097V8.23976C2.5 7.04976 3.23 5.98972 4.34 5.56972L12.28 2.56972C13.52 2.09972 14.85 3.01975 14.85 4.34975V8.14974" />
        <path d="M22.5588 14.3715V16.4316C22.5588 16.9816 22.1188 17.4315 21.5588 17.4515H19.5988C18.5188 17.4515 17.5288 16.6615 17.4388 15.5815C17.3788 14.9515 17.6188 14.3615 18.0388 13.9515C18.4088 13.5715 18.9188 13.3516 19.4788 13.3516H21.5588C22.1188 13.3716 22.5588 13.8215 22.5588 14.3715Z" />
        <path d="M7 12.4004H14" />
      </svg>
    );
  }

  return (
    <svg className="nav-link-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8.43945 1.75H15.5488C16.2446 1.75 16.908 2.02631 17.4053 2.52344C18.0616 3.1798 18.3223 4.11101 18.1035 5.01172C17.8902 5.88967 17.1568 6.61428 16.2314 6.87988L15.6826 7.03711L15.9111 7.56055L19.7305 16.2988V16.2998C20.4859 18.0356 20.5108 19.439 19.959 20.4492L19.8408 20.6455L19.8398 20.6475C19.4048 21.316 18.3543 22.25 15.8389 22.25H8.15918C5.62263 22.25 4.57314 21.3151 4.13867 20.6475H4.1377C3.47678 19.6258 3.45248 18.1515 4.26758 16.291L4.2666 16.29L8.09668 7.5918L8.33301 7.05566L7.7666 6.90625C7.37711 6.8033 7.01293 6.6105 6.70898 6.34473L6.58301 6.22656C6.104 5.73761 5.81937 5.06381 5.81934 4.37012C5.81934 2.92626 6.9956 1.75 8.43945 1.75ZM8.43945 2.25C7.27331 2.25 6.31934 3.20397 6.31934 4.37012L6.33008 4.58105C6.37302 4.99947 6.5415 5.39584 6.7959 5.71484L6.92969 5.86719L6.93555 5.87402C7.33215 6.27054 7.881 6.49023 8.43945 6.49023H8.73926C8.81913 6.49023 8.90421 6.53405 8.95312 6.60742C8.99575 6.67136 9.00427 6.76138 8.96973 6.84082L4.72168 16.4883L4.7207 16.4893C4.11411 17.8758 3.92828 19.2147 4.43945 20.1855L4.55176 20.375C4.95276 20.9882 5.59765 21.3258 6.23535 21.5117C6.87742 21.6989 7.57016 21.75 8.14941 21.75H15.8291C16.4037 21.75 17.0918 21.6981 17.7314 21.5107C18.328 21.336 18.9301 21.0285 19.3369 20.4873L19.416 20.376L19.4189 20.3721C20.0199 19.4463 19.923 18.1496 19.3818 16.7764L19.2676 16.501V16.5L15.0576 6.83984C15.0235 6.76062 15.0328 6.67116 15.0752 6.60742C15.1261 6.53102 15.2029 6.4903 15.2891 6.49023H15.4492C16.4409 6.49023 17.3934 5.85787 17.626 4.88672L17.625 4.88574C17.8055 4.14582 17.5945 3.40796 17.0625 2.87598C16.6599 2.4736 16.1234 2.25008 15.5596 2.25H8.43945Z" />
      <path d="M6.50293 12.8535C6.85065 12.8587 7.33587 12.8767 7.91211 12.9268C8.92343 13.0146 10.205 13.1992 11.5117 13.5781L12.0723 13.7529C13.5097 14.2338 14.9138 14.0133 15.9355 13.6895C16.7037 13.446 17.2825 13.1355 17.541 12.9844L17.6875 12.8945L17.6904 12.8926C17.7925 12.8236 17.9545 12.8483 18.0361 12.9688C18.1106 13.0788 18.0819 13.2343 17.9658 13.3105L17.9492 13.3213L17.9336 13.334C17.9342 13.3335 17.4797 13.6399 16.7227 13.9463C15.9743 14.2492 14.9623 14.539 13.8408 14.5391C13.3028 14.5391 12.7341 14.4747 12.165 14.3115L11.9209 14.2354L11.9189 14.2344L11.3682 14.0625C10.0837 13.69 8.82484 13.5135 7.84961 13.4297C7.29081 13.3817 6.82112 13.364 6.48828 13.3584H5.92285L5.88672 13.3643C5.86779 13.3671 5.82644 13.3642 5.77344 13.3135C5.71842 13.2608 5.68311 13.1844 5.67969 13.1143C5.67447 13.0068 5.75461 12.8969 5.87207 12.8662L5.9248 12.8584L5.93848 12.8574C5.93848 12.8574 5.98783 12.8542 6.09082 12.8525C6.1892 12.8509 6.32908 12.8509 6.50293 12.8535Z" />
    </svg>
  );
}

function NavArrow() {
  return (
    <svg className="nav-arrow" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M19.5 8.25L12 15.75L4.5 8.25" />
    </svg>
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
