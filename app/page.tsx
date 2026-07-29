import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader, RocketIcon } from "@/components/SiteHeader";
import { HeroAnimations } from "@/components/HeroAnimations";
import { OxipackProofVideo } from "@/components/OxipackProofVideo";
import { ScrollFillText } from "@/components/ScrollFillText";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import { SuccessStage } from "@/components/SuccessStage";
import {
  PlanCallVignette,
  PlanPreviewVignette,
  PlanSlackVignette,
} from "@/components/vignettes/PlanVignettes";
import { SolutionLottie } from "@/components/vignettes/SolutionLottie";
import {
  ValueWorthVignette,
  ValueOutputVignette,
  ValueLaunchVignette,
} from "@/components/vignettes/ValueVignettes";
import { StakesScene } from "@/components/vignettes/StakesScene";
import {
  GuideTeamVignette,
  GuideScopeVignette,
  GuideIndustrialVignette,
} from "@/components/vignettes/GuideVignettes";
import {
  BOOKING_URL,
  SCORECARD_URL,
  OXIPACK_CASE_URL,
  LEARN_MORE_URL,
  SHOW_SCORECARD,
} from "@/lib/site-config";
import { getCaseStudyBySlug } from "@/lib/work/data";

// Oxipack is intentionally not in this strip: it is named once, in the Proof
// section case line, and never in link/logo text (proof-rule discipline).
const logos = [
  ["altify.svg", "Altify", "https://altify.app/"],
  ["sataya.svg", "Sataya", "https://sataya.io/"],
  ["ciruit.svg", "Circuit", "https://circuitprotect.com/"],
  ["blueknight.svg", "Blue Knight", "https://www.blueknight.io/"],
  ["usably.svg", "Usably", "https://www.usably.studio/"],
  ["lathyrus.svg", "Lathyrus", "https://www.lathyrus.io/"],
  ["view-16.svg", "View 16", "https://www.lathyrus.io/"],
  ["design-focus.svg", "Design Focus", "https://www.designfocus.io/"],
  ["emprise-digital.svg", "Emprise Digital", "https://www.emprise.co.za/"],
] as const;

const HERO_SUB =
  "For European industrial manufacturers whose product is better than their brand shows, so buyers finally see why you're worth more than the cheaper alternative.";
const HERO_SCORECARD_LINK = "Check your brand's credibility";
const HERO_SUPPORT =
  "Not ready to book? Run the instant check and see where you're being undersold, on the spot.";

const BOOK_CTA_LABEL = "Book an application call";

const valueTiles = [
  "Buyers See Your Worth",
  "More Output, Faster Turnaround",
  "Brand Ready for Every Launch",
];

const stakesLead = "A great product with a weak brand pays for it every day.";
const stakesBody = [
  "Online, in brochures, and at trade shows, your product looks the same as the cheaper alternatives. So buyers pick on price.",
  "And somewhere in the back of your mind, the question sits: is our branding quietly costing us sales without us even knowing?",
  "You built world-class engineering. Losing to a copycat that simply looks better at first glance is not how this should work.",
];

const guideEmpathy =
  "We know how it feels when your product is the best in the room and your brand doesn't show it. You've done nothing wrong, it just hasn't been anyone's full-time job to own the whole picture.";
const guideAuthority =
  "We've become the in-house creative team that multiple European industrial manufacturers never had.";
const guideBullets = [
  "One team across brand, website, 3D, motion, and production, end to end. Not five suppliers to manage.",
  "Long-term partnerships. Our partners expand scope over time, not the other way around.",
  "From packaging machinery to bulk-solids handling, we speak industrial.",
];

const solutions = [
  {
    title: "Brand Identity",
    text: "We make you look like the market leader you already are.",
  },
  {
    title: "Website",
    text: "We build you a website that sells your product as well as your engineers built it.",
  },
  {
    title: "3D & CGI",
    text: "We show what your machines do, inside and out, without a film crew on site.",
  },
  {
    title: "Video & Motion",
    text: "We produce product films and launch videos that match the engineering.",
  },
  {
    title: "Trade Show & Print",
    text: "We design brochures and stands that make people stop and look twice.",
  },
];

const planSteps = [
  {
    title: "Book an Application Call",
    text: "We only take on about two new partners a month, so the first step is a short application call, not a generic sales pitch. Tell us about your product and where the brand is lagging, and we'll show you what we'd do.",
  },
  {
    title: "See It Before You Commit",
    text: "If it's a fit, we show you live what your brand could look like. A real piece of work, so you judge the quality before you pay anything.",
  },
  {
    title: "Our Team Becomes Your Team",
    text: "We take on your website, brand, 3D, video, and print-ready design, all under one flat monthly retainer.",
  },
];

const planOneLiner =
  "Your product is better than your brand shows, so buyers pick the cheaper option. Nexubis becomes your in-house creative team: brand, website, 3D, video, and print on one flat retainer. Your brand finally matches your engineering, and buyers see why you're worth more.";

const scorecardBullets = [
  "Your Credibility Score across the five places buyers look",
  "A side-by-side benchmark against two or three competitors you choose",
  "The first place to fix, explained in a short personal video",
];
const scorecardSub =
  "Run the Industrial Brand Credibility Scorecard, powered by Nexubis AI. Enter your website and see, on the spot, how well your brand represents your product, how you benchmark against competitors you name, and the first place to fix.";
const scorecardExpectation =
  "You see your result on the spot. Unlock the full report by email, no waiting.";
const scorecardMicroProof =
  "Free, no obligations. We take on two new partners a month; the Scorecard is where most start.";

const proofPlaceholderQuote = "[DMN quote to collect: Before Nexubis, X. Now Y.]";
const proofCaseLine =
  "One year with Oxipack: 35% more output at a 33% lower effective rate, with scope that kept expanding without a single re-quote.";
const oxipackShowreel = getCaseStudyBySlug("oxipack")?.heroVideo;
const oxipackProofVideo =
  oxipackShowreel?.src && oxipackShowreel.poster && oxipackShowreel.title
    ? {
        src: oxipackShowreel.src,
        poster: oxipackShowreel.poster,
        title: oxipackShowreel.title,
      }
    : null;

// Build-time guard: the Proof quote is a to-collect placeholder that must not ship.
// This module runs during static generation, so the warning surfaces in build logs.
if (
  process.env.NODE_ENV === "production" &&
  proofPlaceholderQuote.includes("quote to collect")
) {
  console.warn(
    `\n⚠️  Nexubis build warning: placeholder proof content is present in a production build.\n   Replace the DMN quote before shipping: ${proofPlaceholderQuote}\n`,
  );
}

const successBody =
  "Picture the next trade show. Your stand, your brochures, your website, all finally looking like the company you actually are. Buyers stop comparing you on price. Distributors lead with your name. And when the next product launches, the brand is ready on day one. You're never the one holding things up.";

const proofBarLines = [
  "Multi-year partnerships. Not one-off projects.",
  "One team, one invoice. Brand, website, 3D, video, print.",
  "Limited spots, two new partners a month max. We stay hands-on.",
];

const faqs = [
  [
    "We already work with an agency and a few freelancers. Why switch?",
    "You don't have to switch on day one. Most of our partners started with one project alongside their existing setup, saw the difference, and grew from there. No rip-and-replace.",
  ],
  [
    "How does pricing work?",
    "One flat monthly retainer, one invoice. No quotes per project, no surprise costs. You apply with a short form first, then we agree the right level on the call.",
  ],
  [
    "What if we don't have enough work every month?",
    "Then a retainer isn't right for you yet, and we'll tell you. Our model works for companies with a steady stream of brand, website, video, and print needs.",
  ],
  [
    "Our products are technical. Will you actually understand them?",
    "It's all we do. Packaging machinery, leak detection, bulk-solids handling, valves, process equipment. Your engineers won't have to explain things twice.",
  ],
  [
    "Are we locked into a long contract?",
    "No. Cancel anytime. We keep partners by being good, not by locking the door.",
  ],
  [
    "Why an application call instead of a generic sales call?",
    "We take on about two new partners a month, so we check fit first, and the call is where we look at your brand and show you real work, not a pitch. It saves your time as much as ours.",
  ],
  [
    "How do we know the quality before paying?",
    "You see it first. If the application is a fit, we create a real piece of work for your brand, live, before you commit to anything.",
  ],
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <ValueStack />
        <Stakes />
        <Guide />
        <Solutions />
        <Plan />
        {SHOW_SCORECARD ? <ScorecardBlock /> : null}
        <Proof />
        <Success />
        <ProofBar />
        <Faq />
      </main>
      <SiteFooter />
      <RevealOnScroll />
    </>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="cta-arrow">
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BookCallButton({ className = "" }: { className?: string }) {
  return (
    <Link
      href={BOOKING_URL}
      className={`btn btn-primary rocket-button ${className}`.trim()}
    >
      <span className="rocket-button-icon">
        <RocketIcon />
      </span>
      <span className="rocket-button-text">{BOOK_CTA_LABEL}</span>
    </Link>
  );
}

function Hero() {
  return (
    <section className="hero-section section hero-intro-pending">
      <HeroAnimations />
      <div className="site-container hero-inner">
        <div className="hero-row">
          <div className="hero-col hero-title-wrap">
            <h1 aria-label="Look as Credible as Your Engineering, with One In-House Creative Team.">
              <span className="hero-title-muted">
                <span className="hero-title-word">Look</span>{" "}
                <span className="hero-title-word">as</span>{" "}
                <span className="hero-title-word">Credible</span>{" "}
                <span className="hero-title-word">as</span>{" "}
                <span className="hero-title-word">Your</span>{" "}
                <span className="hero-title-word">Engineering,</span>{" "}
              </span>
              <span className="hero-title-word">with</span>{" "}
              <span className="hero-title-word">One</span>{" "}
              <span className="hero-title-word">In-House</span>{" "}
              <span className="hero-title-word">Creative</span>{" "}
              <span className="hero-title-word">Team.</span>
            </h1>
          </div>
        </div>

        <div className="hero-row hero-copy-row">
          <div className="hero-col hero-copy">
            <p>{HERO_SUB}</p>
            <div className="btn-group hero-buttons">
              <BookCallButton className="hero-primary" />
              {SHOW_SCORECARD ? (
                <Link href={SCORECARD_URL} className="btn btn-secondary hero-scorecard-btn">
                  <span>{HERO_SCORECARD_LINK}</span>
                  <ArrowIcon />
                </Link>
              ) : null}
            </div>
            {SHOW_SCORECARD ? <p className="hero-support">{HERO_SUPPORT}</p> : null}
          </div>
        </div>

        <div className="hero-reel-row">
          <div className="hero-reel">
            <div className="hero-reel-wrap">
              <div className="hero-reel-video">
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="none"
                  poster="/assets/images/reel_draft.jpg"
                >
                  <source
                    src="https://pub-d0adc0fc26c84d8e8c8db97d1ab2d30f.r2.dev/nexubis/reel.mp4"
                    type="video/mp4"
                  />
                </video>
                <button
                  className="hero-reel-control"
                  type="button"
                  aria-label="Unmute showreel"
                  aria-pressed="false"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="hero-reel-unmute"
                    aria-hidden="true"
                  >
                    <path
                      d="M14.9916 3.9756C15.6784 3.44801 16.4957 3.01957 17.367 3.38808C18.2302 3.75318 18.5076 4.63267 18.6274 5.49785C18.7502 6.38459 18.7502 7.60557 18.7502 9.12365V14.8794C18.7502 16.3975 18.7502 17.6185 18.6274 18.5052C18.5076 19.3704 18.2302 20.2499 17.367 20.615C16.4957 20.9835 15.6784 20.5551 14.9916 20.0275C14.2892 19.488 13.3966 18.5765 12.3467 17.5044C11.8072 16.9535 11.4492 16.6873 11.0866 16.5374C10.7222 16.3868 10.2791 16.3229 9.50619 16.3229C8.83768 16.3229 8.23963 16.3229 7.78679 16.2758C7.31184 16.2265 6.87088 16.1191 6.47421 15.8485C5.7184 15.3328 5.42917 14.5777 5.31957 13.8838C5.23785 13.3663 5.24723 12.7981 5.25479 12.3405V11.6626C5.24723 11.205 5.23785 10.6368 5.31957 10.1193C5.42917 9.42536 5.7184 8.67029 6.47421 8.15462C6.87088 7.88398 7.31184 7.77657 7.78679 7.72723C8.23963 7.68019 8.83768 7.68021 9.50619 7.68023C10.2791 7.68023 10.7222 7.61628 11.0866 7.46563C11.4492 7.31574 11.8072 7.04954 12.3466 6.49869C13.3966 5.42655 14.2892 4.51511 14.9916 3.9756Z"
                      fill="currentColor"
                    />
                  </svg>
                  <svg
                    viewBox="0 0 24 24"
                    className="hero-reel-mute"
                    aria-hidden="true"
                  >
                    <path
                      d="M10.9916 3.9756C11.6784 3.44801 12.4957 3.01957 13.367 3.38808C14.2302 3.75318 14.5076 4.63267 14.6274 5.49785C14.7502 6.38459 14.7502 7.60557 14.7502 9.12365V14.8794C14.7502 16.3975 14.7502 17.6185 14.6274 18.5052C14.5076 19.3704 14.2302 20.2499 13.367 20.615C12.4957 20.9835 11.6784 20.5551 10.9916 20.0275C10.2892 19.488 9.3966 18.5765 8.34667 17.5044C7.80717 16.9535 7.44921 16.6873 7.08663 16.5374C6.72221 16.3868 6.27914 16.3229 5.50619 16.3229C4.83768 16.3229 4.23963 16.3229 3.78679 16.2758C3.31184 16.2265 2.87088 16.1191 2.47421 15.8485C1.7184 15.3328 1.42917 14.5777 1.31957 13.8838C1.23785 13.3663 1.24723 12.7981 1.25479 12.3405V11.6626C1.24723 11.205 1.23785 10.6368 1.31957 10.1193C1.42917 9.42536 1.7184 8.67029 2.47421 8.15462C2.87088 7.88398 3.31184 7.77657 3.78679 7.72723C4.23963 7.68019 4.83768 7.68021 5.50619 7.68023C6.27914 7.68023 6.72221 7.61628 7.08663 7.46563C7.44922 7.31574 7.80717 7.04954 8.34663 6.49869C9.39659 5.42655 10.2892 4.51511 10.9916 3.9756Z"
                      fill="currentColor"
                    />
                    <path
                      d="M17.2929 9.29289C17.6834 8.90237 18.3166 8.90237 18.7071 9.29289L20 10.5858L21.2929 9.29289C21.6834 8.90237 22.3166 8.90237 22.7071 9.29289C23.0976 9.68342 23.0976 10.3166 22.7071 10.7071L21.4142 12L22.7071 13.2929C23.0976 13.6834 23.0976 14.3166 22.7071 14.7071C22.3166 15.0976 21.6834 15.0976 21.2929 14.7071L20 13.4142L18.7071 14.7071C18.3166 15.0976 17.6834 15.0976 17.2929 14.7071C16.9024 14.3166 16.9024 13.6834 17.2929 13.2929L18.5858 12L17.2929 10.7071C16.9024 10.3166 16.9024 9.68342 17.2929 9.29289Z"
                      fill="currentColor"
                    />
                  </svg>
                  <svg
                    viewBox="0 0 24 24"
                    className="hero-reel-fullscreen"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="hero-logos-space">
        <div className="hero-logos" aria-label="Partner logos">
          <div className="hero-logos-track">
            {logos.map(([image, label, href]) => (
              <a key={label} href={href} target="_blank" rel="noreferrer">
                <img src={`/assets/images/${image}`} alt={label} />
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="hero-bg-wrap" aria-hidden="true">
        <img className="hero-bg" src="/assets/images/nx-hero-bg.webp" alt="" />
      </div>
      <img
        className="hero-mark"
        src="/assets/images/bg-mark.svg"
        alt=""
        aria-hidden="true"
      />
      <span className="hero-glow" aria-hidden="true" />
    </section>
  );
}

const valueVignettes = [
  ValueWorthVignette,
  ValueOutputVignette,
  ValueLaunchVignette,
];

function ValueStack() {
  return (
    <section className="section value-section">
      <div className="site-container">
        <ul className="value-grid">
          {valueTiles.map((tile, index) => {
            const Vignette = valueVignettes[index];
            return (
              <li
                className="value-tile"
                key={tile}
                data-reveal
                data-reveal-delay={(index + 1) * 0.1}
              >
                <div className="value-vignette">
                  <Vignette />
                </div>
                <div className="value-tile-label">
                  <span className="value-tile-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h2>{tile}</h2>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function Stakes() {
  return (
    <section className="section stakes-section">
      <div className="site-container">
        <div className="stakes-inner">
          <p className="stakes-lead" data-reveal>
            {stakesLead}
          </p>
          <div className="stakes-body" data-reveal data-reveal-delay={0.1}>
            {stakesBody.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
        <StakesScene />
      </div>
    </section>
  );
}

function Guide() {
  return (
    <section className="section guide-section">
      <div className="site-container">
        <div className="guide-grid">
          <div className="guide-lead" data-reveal>
            <ScrollFillText className="guide-empathy" text={guideEmpathy} />
            <div className="guide-authority">
              <p>{guideAuthority}</p>
            </div>
          </div>
          <ul className="guide-proof-cards" data-reveal data-reveal-delay={0.1}>
            {guideBullets.map((bullet, i) => {
              const GVignette = guideVignettes[i];
              return (
                <li className="guide-proof-card" key={bullet}>
                  <div className="guide-proof-vignette">
                    <GVignette />
                  </div>
                  <p>{bullet}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

const guideVignettes = [
  GuideTeamVignette,
  GuideScopeVignette,
  GuideIndustrialVignette,
];

// Designer-supplied Lottie per service, in the same order as `solutions`.
const solutionLotties = [
  "/assets/lotties/solution-brand.json",
  "/assets/lotties/solution-website.json",
  "/assets/lotties/solution-3d.json",
  "/assets/lotties/solution-video.json",
  "/assets/lotties/solution-tradeshow.json",
];

function Solutions() {
  return (
    <section id="what-we-do" className="section solutions-accordion-section">
      <div className="site-container">
        <div className="solutions-accordion-head" data-reveal>
          <h2>What We Take Off Your Plate</h2>
        </div>
        <div className="solutions-accordion">
          {solutions.map((solution, index) => {
            const lottieSrc = solutionLotties[index];
            return (
              <details
                className="solution-row"
                name="solutions"
                key={solution.title}
                open={index === 0}
                data-reveal
                data-reveal-delay={0.05 * (index + 1)}
              >
                <summary>
                  <span className="solution-row-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="solution-row-title">{solution.title}</span>
                  <svg
                    className="chevron"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M19.5 8.25L12 15.75L4.5 8.25"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </summary>
                <div className="solution-row-body">
                  <div className="solution-row-copy">
                    <p>{solution.text}</p>
                    <Link href={LEARN_MORE_URL} className="text-cta">
                      <span>Learn more</span>
                      <ArrowIcon />
                    </Link>
                  </div>
                  {lottieSrc ? (
                    <div className="solution-row-vignette">
                      <SolutionLottie src={lottieSrc} />
                    </div>
                  ) : null}
                </div>
              </details>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const planVignettes = [
  PlanCallVignette,
  PlanPreviewVignette,
  PlanSlackVignette,
];

function Plan() {
  return (
    <section className="section plan-section">
      <div className="site-container">
        <div className="plan-head" data-reveal>
          <h2>How It Works</h2>
        </div>
        <ol className="plan-grid">
          {planSteps.map((step, index) => {
            const Vignette = planVignettes[index];
            return (
              <li
                className="plan-card"
                key={step.title}
                data-reveal
                data-reveal-delay={(index + 1) * 0.1}
              >
                <div className="plan-card-head">
                  <span className="plan-card-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3>{step.title}</h3>
                </div>
                <p>{step.text}</p>
                {Vignette ? (
                  <div className="plan-vignette">
                    <Vignette />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
        <div className="plan-footer" data-reveal data-reveal-delay={0.1}>
          <p className="plan-oneliner">{planOneLiner}</p>
          <div className="btn-group">
            <BookCallButton />
          </div>
        </div>
      </div>
    </section>
  );
}

function ScorecardBlock({ showMicroProof = true }: { showMicroProof?: boolean }) {
  return (
    <section id="scorecard-block" className="section scorecard-section">
      <div className="site-container">
        <div className="scorecard-panel" data-reveal>
          <div className="scorecard-copy">
            <h2>How Credible Is Your Brand, Really?</h2>
            <p className="scorecard-sub">{scorecardSub}</p>
            <ul className="scorecard-bullets">
              {scorecardBullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
            <div className="scorecard-actions">
              <Link href={SCORECARD_URL} className="btn btn-primary scorecard-cta">
                <span>Check my brand&apos;s credibility</span>
                <ArrowIcon />
              </Link>
              <p className="scorecard-expectation">{scorecardExpectation}</p>
            </div>
            {showMicroProof ? (
              <p className="scorecard-microproof">{scorecardMicroProof}</p>
            ) : null}
          </div>

          <div className="scorecard-report" data-vignette aria-hidden="true">
            <div className="scr-head">
              <div className="scr-ring">
                <svg viewBox="0 0 42 42">
                  <circle className="scr-ring-track" cx="21" cy="21" r="18" />
                  <circle className="scr-ring-fill" cx="21" cy="21" r="18" />
                </svg>
                <span className="scr-score">62</span>
              </div>
              <div className="scr-verdict">
                <span className="scr-verdict-label">Credibility score</span>
                <span className="scr-verdict-line" />
                <span className="scr-verdict-tag">Undersold in 3 of 5 places</span>
              </div>
            </div>
            <div className="scr-thumbs">
              <div className="scr-thumb scr-thumb-you">
                <span className="scr-thumb-cap">You</span>
                <span className="scr-thumb-bar" />
                <span className="scr-thumb-bar scr-thumb-bar-sm" />
              </div>
              <div className="scr-thumb scr-thumb-comp">
                <span className="scr-thumb-cap">Competitor</span>
                <span className="scr-thumb-bar" />
                <span className="scr-thumb-bar scr-thumb-bar-sm" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Proof() {
  // Split the case line so the two stats read as chips, without changing the text.
  const caseParts = proofCaseLine.split(/(35%|33%)/);
  return (
    <section className="section proof-section">
      <div className="site-container">
        <div className="proof-grid">
          <figure className="proof-quote" data-reveal>
            <div className="proof-bubble">
              <svg viewBox="0 0 51 42" aria-hidden="true" className="quote-mark">
                <path d="M4.327 6.373C7.903 2.476 13.315.5 20.41.5h2.549v7.224l-2.05.412c-3.492.702-5.921 2.083-7.221 4.11a7.1 7.1 0 0 0-1.117 3.629h7.839a2.56 2.56 0 0 1 2.549 2.563v17.937c0 2.826-2.287 5.125-5.099 5.125H2.565a2.56 2.56 0 0 1-2.549-2.563V26.125l.008-7.48c-.023-.284-.508-7.024 4.303-12.272ZM45.902 41.5H30.606a2.56 2.56 0 0 1-2.549-2.563V26.125l.008-7.48c-.023-.284-.507-7.024 4.303-12.272C35.944 2.476 41.356.5 48.451.5H51v7.224l-2.05.412c-3.492.702-5.921 2.083-7.221 4.11a7.1 7.1 0 0 0-1.117 3.629h7.839A2.56 2.56 0 0 1 51 18.438v17.937c0 2.826-2.287 5.125-5.098 5.125Z" />
              </svg>
              <blockquote className="proof-placeholder">{proofPlaceholderQuote}</blockquote>
            </div>
            <figcaption className="proof-attribution">
              {/* Headshot placeholder - swap for <img> once Brigitte's photo lands. */}
              <span className="proof-avatar" aria-hidden="true" />
              <img
                className="proof-logo"
                src="/assets/images/dmn-westinghouse.png"
                alt="DMN Westinghouse"
                width={370}
                height={191}
              />
              <span className="proof-divider" aria-hidden="true" />
              <span className="proof-person">
                <span className="proof-name">Brigitte</span>
                <span className="proof-role">Marketing Manager</span>
              </span>
            </figcaption>
          </figure>

          <article className="proof-case" data-reveal data-reveal-delay={0.1}>
            {oxipackProofVideo ? (
              <OxipackProofVideo
                src={oxipackProofVideo.src}
                poster={oxipackProofVideo.poster}
                title={oxipackProofVideo.title}
              />
            ) : null}
            <p className="proof-case-line">
              {caseParts.map((part, i) =>
                part === "35%" || part === "33%" ? (
                  <span className="proof-stat" key={i}>
                    {part}
                  </span>
                ) : (
                  part
                ),
              )}
            </p>
            <Link href={OXIPACK_CASE_URL} className="text-cta">
              <span>Read the full case study</span>
              <ArrowIcon />
            </Link>
          </article>
        </div>
      </div>
    </section>
  );
}

function Success() {
  return (
    <SuccessStage body={successBody}>
      <BookCallButton />
    </SuccessStage>
  );
}

function ProofBarTrack({ clone = false }: { clone?: boolean }) {
  return (
    <ul className="proof-bar-track" aria-hidden={clone || undefined}>
      {proofBarLines.map((line, index) => (
        <li className="proof-bar-item" key={index}>
          <span className="proof-bar-mark" aria-hidden="true" />
          {line}
        </li>
      ))}
    </ul>
  );
}

function ProofBar() {
  return (
    <section className="proof-bar-section">
      <div className="proof-bar-marquee">
        <ProofBarTrack />
        <ProofBarTrack clone />
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section className="section faq-section faq-solo">
      <div className="site-container">
        <div className="faq-list" data-reveal>
          {faqs.map(([question, answer]) => (
            <details key={question} name="homepage-faq">
              <summary>
                <span>{question}</span>
                <svg
                  className="chevron"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M19.5 8.25L12 15.75L4.5 8.25"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </div>
      <img className="faq-bg" src="/assets/images/bg-mark.svg" alt="" />
    </section>
  );
}
