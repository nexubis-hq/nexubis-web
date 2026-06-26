import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader, RocketIcon } from "@/components/SiteHeader";
import { NexubisLogo } from "@/components/NexubisLogo";
import { WorkSection } from "@/components/WorkSection";

const logos = [
  ["altify.svg", "Altify", "https://altify.app/"],
  ["sataya.svg", "Sataya", "https://sataya.io/"],
  ["oxipack.svg", "Oxipack", "https://www.oxipack.com/"],
  ["ciruit.svg", "Circuit", "https://circuitprotect.com/"],
  ["blueknight.svg", "Blue Knight", "https://www.blueknight.io/"],
  ["usably.svg", "Usably", "https://www.usably.studio/"],
  ["lathyrus.svg", "Lathyrus", "https://www.lathyrus.io/"],
  ["view-16.svg", "View 16", "https://www.lathyrus.io/"],
  ["design-focus.svg", "Design Focus", "https://www.designfocus.io/"],
  ["emprise-digital.svg", "Emprise Digital", "https://www.emprise.co.za/"],
] as const;

const solutions = [
  {
    title: (
      <>
        Brand <br />
        Development
      </>
    ),
    text: "We craft brands that resonate and endure. From logos to full brand stories, we combine strategy and creativity to position your business at the forefront.",
    items: [
      "Brand Strategy",
      "Positioning",
      "Logo Design",
      "Visual Identity",
      "Brand Guidelines",
      "Style Guides",
      "Brand Messaging",
      "Brand Collateral",
    ],
  },
  {
    title: (
      <>
        Product &amp; <br />
        Web Design
      </>
    ),
    text: "We create intuitive, engaging designs that drives conversions. Our approach balances aesthetics with functionality to help your products stand out.",
    items: [
      "UX Research",
      "UI Design",
      "Prototyping",
      "Website Design",
      "Design Systems",
      "Usability Testing",
      "Usability Optimisation",
    ],
  },
  {
    title: (
      <>
        Web &amp; App <br />
        Development
      </>
    ),
    text: "We build scalable digital solutions that perform flawlessly across all devices. Our expertise brings your design vision to life with cutting-edge technology.",
    items: [
      "Website Development",
      "E-commerce",
      "Headless Shopify Solutions",
      "Framer Development",
      "Technical SEO",
      "UI Design",
      "Pitchdecks",
    ],
  },
];

const steps = [
  {
    title: (
      <>
        Connect with Our <br />
        Sales Team
      </>
    ),
    image: "book-cal.png",
  },
  {
    title: "Collaborate on Your Custom Project Plan",
    image: "process_card-2.webp",
  },
  {
    title: (
      <>
        Elevate development <br />
        through partnership
      </>
    ),
    image: "process_card-3.webp",
  },
  {
    title: (
      <>
        Launch with <br />
        Confidence
      </>
    ),
    image: "process_card-4.webp",
  },
];

const reviews = [
  {
    name: "Brian Carter",
    first: "Amazing to work with!",
    second:
      "They always deliver quality work within the agreed-upon timeframes. I wholeheartedly recommend their services.",
    reply: "We appreciate your recommendation, Brian!",
    avatar: "review-brian.webp",
    role: "Founder",
    company: "Usably Studio",
  },
  {
    name: "Alex Marais",
    first: "Seamless collaboration!",
    second:
      "Nexubis delivers high-quality work with swift turnarounds, excellence in any project scope.",
    reply: "Thank you, Alex! We value our partnership.",
    avatar: "review-alex.webp",
    role: "Founder",
    company: "Design Focus",
  },
  {
    name: "Llewellyn Hattingh",
    first: "Nexubis is a hidden gem.",
    second:
      "Their ability to understand and surpass my expectations is exceptional. An incredible team to work with.",
    reply: "We appreciate your feedback, Llewellyn!",
    avatar: "review-llewellyn.webp",
    role: "Co-Founder",
    company: "Drenlin Commerce",
  },
  {
    name: "Simónn du Plooy",
    first: "Impressive speed and quality!",
    second:
      "Nexubis accelerated our branding with a fully developed website in just a week.",
    reply: "Thanks for the kind words, Simonn!",
    avatar: "review-simonn.webp",
    role: "Recruitement Specialist",
    company: "Sataya",
  },
];

const faqs = [
  [
    "What makes Nexubis different from other design agencies?",
    "We don't just focus on aesthetics - our approach combines strategic thinking, technical expertise, and creative innovation to deliver solutions that not only look great but also drive results.",
  ],
  [
    "What services does Nexubis offer?",
    "Nexubis specializes in web design, Webflow development, 3D design, animation, and systems implementation. We create seamless digital experiences tailored to your unique needs, whether for corporate or personal projects.",
  ],
  [
    "Does Nexubis provide UI/UX design for apps and software?",
    "Yes! Our UI/UX design services focus on intuitive, user-friendly interfaces for web and mobile applications, ensuring a smooth and engaging experience for users.",
  ],
  [
    "Can Nexubis create custom animations and 3D designs?",
    "Absolutely! Our team crafts high-quality animations and 3D designs for product visualizations, brand storytelling, and interactive digital experiences that captivate audiences.",
  ],
  [
    "Can Nexubis integrate third-party tools and systems?",
    "Yes! We specialize in seamless integrations with platforms like CRM systems, payment gateways, analytics tools, and more to enhance functionality and streamline your business processes.",
  ],
  [
    "How does Nexubis approach system implementation?",
    "We analyze your business needs and implement custom systems and integrations that improve workflow, efficiency, and scalability. Whether automating processes or connecting multiple platforms, we ensure smooth operations.",
  ],
  [
    "How does Nexubis ensure websites are optimized for performance?",
    "We prioritize speed, SEO, and user experience by optimizing images, code, and structure. Our websites are built to load fast, rank well on search engines, and provide seamless navigation. As part of our process, we conduct a website audit at the start and end of the project to identify areas for improvement and measure performance gains, ensuring your site is fully optimized and delivering the best possible results.",
  ],
  [
    "How will a Nexubis design improve my customers' online experience?",
    "We focus on user-centric design, ensuring your website is visually engaging, easy to navigate, and optimized for conversions—turning visitors into loyal customers.",
  ],
  [
    "How does Nexubis help businesses stay ahead of the competition?",
    "We combine cutting-edge design, innovative technology, and strategic thinking to create solutions that set you apart. Whether through stunning visuals, engaging animations, or seamless integrations, we help your brand stand out and grow.",
  ],
  [
    "Does Nexubis offer support after a project goes live?",
    "Absolutely! We provide ongoing support, maintenance, and updates to ensure your website or system remains secure, optimized, and performing at its best.",
  ],
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <Solutions />
        <Work />
        <Reviews />
        <Comparison />
        <Steps />
        <Faq />
        <CloudCta />
      </main>
      <SiteFooter />
    </>
  );
}

function Hero() {
  return (
    <section className="hero-section section">
      <div className="site-container hero-inner">
        <div className="hero-row">
          <div className="hero-col hero-title-wrap">
            <h1>
              <span>Design, Development </span>— and Growth Powerhouse
            </h1>
          </div>
        </div>

        <div className="hero-row hero-copy-row">
          <div className="hero-col hero-copy">
            <p>
              We&apos;re a Cape Town based B2B Design, Development and Growth
              Partner for startups and established businesses
            </p>
            <div className="btn-group hero-buttons">
              <Link href="/contact" className="btn btn-primary hero-primary">
                <RocketIcon />
                <span>Get Started</span>
              </Link>
              <Link href="/packages" className="btn btn-secondary">
                Our Packages
              </Link>
            </div>
          </div>
        </div>

        <div className="hero-reel-row">
          <div className="hero-reel">
            <div className="hero-reel-wrap">
              <div className="hero-reel-video">
                <video
                  muted
                  loop
                  playsInline
                  poster="/assets/images/reel_draft.jpg"
                >
                  <source
                    src="https://pub-d0adc0fc26c84d8e8c8db97d1ab2d30f.r2.dev/nexubis/reel.mp4"
                    type="video/mp4"
                  />
                </video>
                <div className="hero-reel-control" aria-hidden="true">
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
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="hero-logos-space">
        <div className="hero-logos" aria-label="Client logos">
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
    </section>
  );
}

function Eyebrow({
  children,
  dark = false,
  icon = "solutions",
}: {
  children: string;
  dark?: boolean;
  icon?: "solutions" | "work" | "testimonials" | "process";
}) {
  return (
    <div className={dark ? "eyebrow eyebrow-dark" : "eyebrow"}>
      <SectionIcon type={icon} />
      <p>{children}</p>
    </div>
  );
}

function SectionIcon({
  type,
}: {
  type: "solutions" | "work" | "testimonials" | "process";
}) {
  if (type === "work") {
    return (
      <article className="eyebrow-icon">
        <svg
          viewBox="0 0 24 24"
          width="100%"
          color="currentColor"
          fill="none"
          aria-hidden="true"
        >
          <path
            opacity="0.4"
            d="M12 2.25C12.4142 2.25 12.75 2.58579 12.75 3C12.75 5.00608 13.7606 7.07493 15.3428 8.65717C16.9251 10.2394 18.9939 11.25 21 11.25C21.4142 11.25 21.75 11.5858 21.75 12C21.75 12.4142 21.4142 12.75 21 12.75C18.9939 12.75 16.9251 13.7606 15.3428 15.3428C13.7606 16.9251 12.75 18.9939 12.75 21C12.75 21.4142 12.4142 21.75 12 21.75C11.5858 21.75 11.25 21.4142 11.25 21C11.25 18.9939 10.2394 16.9251 8.65717 15.3428C7.07493 13.7606 5.00608 12.75 3 12.75C2.58579 12.75 2.25 12.4142 2.25 12C2.25 11.5858 2.58579 11.25 3 11.25C5.00608 11.25 7.07493 10.2394 8.65717 8.65717C10.2394 7.07493 11.25 5.00608 11.25 3C11.25 2.58579 11.5858 2.25 12 2.25Z"
            fill="currentColor"
          />
          <path
            d="M19.25 1.25C19.4635 1.25 19.6484 1.39794 19.6954 1.6062L19.9296 2.64601C20.0895 3.35601 20.644 3.91047 21.354 4.07041L22.3938 4.30464C22.6021 4.35155 22.75 4.53652 22.75 4.75C22.75 4.96348 22.6021 5.14845 22.3938 5.19536L21.354 5.42959C20.644 5.58953 20.0895 6.14398 19.9296 6.85398L19.6954 7.8938C19.6484 8.10206 19.4635 8.25 19.25 8.25C19.0365 8.25 18.8516 8.10206 18.8046 7.8938L18.5704 6.85398C18.4105 6.14398 17.856 5.58953 17.146 5.42959L16.1062 5.19536C15.8979 5.14845 15.75 4.96348 15.75 4.75C15.75 4.53652 15.8979 4.35155 16.1062 4.30464L17.146 4.07041C17.856 3.91047 18.4105 3.35602 18.5704 2.64601L18.8046 1.6062C18.8516 1.39794 19.0365 1.25 19.25 1.25Z"
            fill="currentColor"
          />
          <path
            d="M4.75 15.75C4.96348 15.75 5.14845 15.8979 5.19536 16.1062L5.42959 17.146C5.58953 17.856 6.14398 18.4105 6.85398 18.5704L7.8938 18.8046C8.10206 18.8516 8.25 19.0365 8.25 19.25C8.25 19.4635 8.10206 19.6484 7.8938 19.6954L6.85398 19.9296C6.14398 20.0895 5.58953 20.644 5.42959 21.354L5.19536 22.3938C5.14845 22.6021 4.96348 22.75 4.75 22.75C4.53652 22.75 4.35155 22.6021 4.30464 22.3938L4.07041 21.354C3.91047 20.644 3.35602 20.0895 2.64601 19.9296L1.6062 19.6954C1.39794 19.6484 1.25 19.4635 1.25 19.25C1.25 19.0365 1.39794 18.8516 1.6062 18.8046L2.64601 18.5704C3.35602 18.4105 3.91047 17.856 4.07041 17.146L4.30464 16.1062C4.35155 15.8979 4.53652 15.75 4.75 15.75Z"
            fill="currentColor"
          />
        </svg>
      </article>
    );
  }

  if (type === "testimonials") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="eyebrow-icon">
        <path
          opacity="0.4"
          d="M13.8 1.4A11 11 0 0 0 12 1.25c-5.9 0-10.75 4.59-10.75 10.32 0 2.75 1.12 5.24 2.93 7.08.27.27.36.55.32.76a5.4 5.4 0 0 1-.93 2.01.75.75 0 0 0 .44 1.21 8.5 8.5 0 0 0 4.72-.73c.23-.13.38-.21.5-.26.03-.02.11-.05.2-.04.11.02.26.04.5.09.68.13 1.37.19 2.07.19 5.9 0 10.75-4.59 10.75-10.31 0-.68-.07-1.34-.2-1.98-1.11 1.35-2.57 2.02-3.05 2.02s-1.95-.67-3.06-2.02c-1.21-.95-2.51-2.61-2.51-5.13V3c0-.66.32-1.24.8-1.6Z"
          fill="currentColor"
        />
        <path
          d="M18.5 1.25c.13.01.3.05.41.13.15.08.58.31.86.42.57.23 1.35.45 2.23.45.41 0 .75.34.75.75v2.5c0 4.07-4.25 5.25-4.25 5.25S14.25 9.57 14.25 5.5V3c0-.41.34-.75.75-.75.88 0 1.66-.22 2.22-.45.28-.11.72-.34.87-.42.11-.08.28-.12.41-.13Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (type === "process") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="eyebrow-icon">
        <path
          opacity="0.4"
          d="M11.8 1.25h-1.1c-3.68 0-5.53 0-6.31 1.39C2 4.34 2 6.65 2 9.94v4.12c0 3.67 0 5.53 1.39 7.3.75.75 1.7 1.08 2.87 1.24 1.14.15 2.6.15 4.43.15h.71a2 2 0 0 1-.15-.75v-1.3c0-.3 0-.87.23-1.44.23-.56.64-.96.86-1.18l4.99-5c.19-.19.55-.54 1-.77.68-.33 1.45-.4 2.17-.19V9.94c0-3.67 0-5.53-1.39-7.3-.75-.75-1.7-1.08-2.87-1.24-1.14-.15-2.6-.15-4.44-.15Z"
          fill="currentColor"
        />
        <path
          d="M6.25 7a1 1 0 0 1 1-1h8a1 1 0 1 1 0 2h-8a1 1 0 0 1-1-1Zm0 5a1 1 0 0 1 1-1h6a1 1 0 1 1 0 2h-6a1 1 0 0 1-1-1Zm12.63 1.43a1.75 1.75 0 0 1 1.56 0c.26.13.6.47.81.68.21.22.44.44.57.7a1.75 1.75 0 0 1 0 1.56c-.13.26-.36.48-.57.69L16.31 22c-.23.23-.47.48-.8.62-.33.13-.68.13-1.01.13h-1.25a.75.75 0 0 1-.75-.75v-1.25c0-.33 0-.68.13-1.01.14-.32.39-.57.62-.8L18.19 14c.21-.21.43-.44.69-.57Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  return (
    <article className="eyebrow-icon">
      <svg
        viewBox="0 0 14 14"
        width="100%"
        color="red"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M6.71609 5.50909C6.41842 5.36155 6.06888 5.36155 5.77117 5.50909C5.61212 5.5879 5.44205 5.75868 5.30769 5.89363C5.17274 6.02797 5.00196 6.19807 4.92315 6.35709C4.77562 6.65482 4.77562 7.00436 4.92315 7.30203C5.00196 7.46111 5.13807 7.59661 5.27303 7.73096L5.30769 7.76555L10.355 12.8129C10.4893 12.9479 10.6248 13.084 10.7839 13.1628C11.0816 13.3103 11.4311 13.3103 11.7289 13.1628C11.8879 13.084 12.058 12.9132 12.1923 12.7782C12.3273 12.6439 12.498 12.4738 12.5768 12.3148C12.7244 12.0171 12.7244 11.6675 12.5768 11.3698C12.498 11.2108 12.3619 11.0753 12.227 10.9409L7.17961 5.89363L7.14502 5.85898C7.01068 5.72401 6.87517 5.5879 6.71609 5.50909ZM5.92632 6.51255C6.01528 6.42365 6.06923 6.36992 6.11205 6.33166C6.15493 6.28686 6.26757 6.22415 6.37508 6.33166C6.41795 6.36992 6.47191 6.42365 6.56081 6.51255L7.50464 7.45638L6.87015 8.09087L5.92632 7.14704C5.83742 7.05814 5.7837 7.00418 5.74545 6.96131C5.63895 6.85479 5.70108 6.74156 5.74545 6.69828C5.7837 6.65546 5.83742 6.60145 5.92632 6.51255Z"
          fill="currentColor"
        />
        <path
          opacity="0.4"
          d="M9.91536 0.730469C10.0984 0.730469 10.2622 0.844452 10.3257 1.01614L10.4976 1.48083C10.737 2.12769 10.8184 2.32083 10.9571 2.45954C11.0959 2.59824 11.289 2.67968 11.9359 2.91904L12.4005 3.09099C12.5722 3.15452 12.6862 3.31823 12.6862 3.5013C12.6862 3.68437 12.5722 3.84808 12.4005 3.91161L11.9359 4.08356C11.289 4.32293 11.0959 4.40437 10.9571 4.54307C10.8184 4.68177 10.737 4.87491 10.4976 5.52178L10.3257 5.98648C10.2622 6.15815 10.0984 6.27214 9.91536 6.27214C9.73231 6.27214 9.56857 6.15815 9.50505 5.98648L9.33308 5.52178C9.09374 4.87491 9.01231 4.68177 8.87359 4.54307C8.73487 4.40437 8.54173 4.32293 7.89487 4.08356L7.43019 3.91161C7.25851 3.84808 7.14453 3.68437 7.14453 3.5013C7.14453 3.31823 7.25851 3.15452 7.43019 3.09099L7.89487 2.91904C8.54173 2.67968 8.73487 2.59824 8.87359 2.45954C9.01231 2.32083 9.09374 2.12769 9.33308 1.48083L9.50505 1.01614C9.56857 0.844452 9.73231 0.730469 9.91536 0.730469Z"
          fill="currentColor"
        />
        <path
          opacity="0.4"
          d="M3.5 1.89844C3.68307 1.89844 3.84678 2.01242 3.91031 2.18411L4.03927 2.53262C4.22227 3.02716 4.27552 3.14413 4.35867 3.22728C4.4418 3.31041 4.55878 3.36367 5.05332 3.54666L5.40183 3.67563C5.57352 3.73916 5.6875 3.90287 5.6875 4.08594C5.6875 4.269 5.57352 4.43272 5.40183 4.49625L5.05331 4.62521C4.55878 4.8082 4.4418 4.86146 4.35866 4.9446C4.27552 5.02774 4.22227 5.14472 4.03927 5.63926L3.91031 5.98778C3.84678 6.15945 3.68307 6.27344 3.5 6.27344C3.31693 6.27344 3.15322 6.15945 3.08969 5.98778L2.96073 5.63926C2.77773 5.14472 2.72448 5.02774 2.64133 4.9446C2.5582 4.86146 2.44122 4.8082 1.94668 4.62521L1.59817 4.49625C1.42648 4.43272 1.3125 4.269 1.3125 4.08594C1.3125 3.90287 1.42648 3.73916 1.59817 3.67563L1.94668 3.54666C2.44122 3.36367 2.5582 3.31041 2.64133 3.22727C2.72448 3.14413 2.77773 3.02716 2.96073 2.53262L3.08969 2.18411C3.15322 2.01242 3.31693 1.89844 3.5 1.89844Z"
          fill="currentColor"
        />
      </svg>
    </article>
  );
}

function Solutions() {
  return (
    <section className="section solutions-section">
      <div className="site-container">
        <div className="solutions-heading-row">
          <div className="solutions-heading-column">
            <div className="section-heading centered">
              <Eyebrow>Our Solutions</Eyebrow>
              <h2>Innovate, Build, and Grow with Confidence</h2>
            </div>
          </div>
        </div>

        <div className="solutions-list-wrap">
          <ul className="solutions-grid">
            {solutions.map((solution, index) => (
              <li className="solution-column" key={index}>
                <article className="solution-card">
                  <div className="solution-card-header">
                    <h3>{solution.title}</h3>
                  </div>
                  <div className="solution-card-body">
                    <p>{solution.text}</p>
                    <ul>
                      {solution.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Work() {
  return (
    <section id="work" className="section work-section">
      <div className="site-container">
        <div className="section-heading">
          <Eyebrow dark icon="work">
            featured Work
          </Eyebrow>
          <h2>Bringing Ideas to Life</h2>
        </div>
        <WorkSection />
      </div>
    </section>
  );
}

function Reviews() {
  return (
    <section className="section reviews-section">
      <div className="site-container">
        <div className="featured-review">
          <div className="review-copy">
            <svg viewBox="0 0 51 42" aria-hidden="true" className="quote-mark">
              <path d="M4.327 6.373C7.903 2.476 13.315.5 20.41.5h2.549v7.224l-2.05.412c-3.492.702-5.921 2.083-7.221 4.11a7.1 7.1 0 0 0-1.117 3.629h7.839a2.56 2.56 0 0 1 2.549 2.563v17.937c0 2.826-2.287 5.125-5.099 5.125H2.565a2.56 2.56 0 0 1-2.549-2.563V26.125l.008-7.48c-.023-.284-.508-7.024 4.303-12.272ZM45.902 41.5H30.606a2.56 2.56 0 0 1-2.549-2.563V26.125l.008-7.48c-.023-.284-.507-7.024 4.303-12.272C35.944 2.476 41.356.5 48.451.5H51v7.224l-2.05.412c-3.492.702-5.921 2.083-7.221 4.11a7.1 7.1 0 0 0-1.117 3.629h7.839A2.56 2.56 0 0 1 51 18.438v17.937c0 2.826-2.287 5.125-5.098 5.125Z" />
            </svg>
            <p>
              Absolutely thrilled with the website Nexubis crafted for us! Their
              team turned our vision into a stunning reality. Highly
              recommended!
            </p>
            <div>
              <h3>Sean Sanders</h3>
              <span>CEO — Altify</span>
            </div>
          </div>
          <div className="review-media">
            <img src="/assets/images/sean-review.png" alt="Sean Sanders" />
          </div>
        </div>

        <div className="section-heading reviews-heading">
          <Eyebrow icon="testimonials">testimonials</Eyebrow>
          <h2>Every company should have the right website partner</h2>
        </div>

        <div className="reviews-rail">
          <div className="reviews-track">
            {reviews.map((review) => (
              <article className="review-card" key={review.name}>
                <p className="review-card-name">{review.name}</p>
                <p className="review-message">{review.first}</p>
                <p className="review-message">{review.second}</p>
                <p className="review-message reply">{review.reply}</p>
                <div className="review-profile">
                  <img
                    src={`/assets/images/${review.avatar}`}
                    alt={review.name}
                  />
                  <div>
                    <h3>{review.name}</h3>
                    <p>
                      {review.role} at of {review.company}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
        <div className="reviews-pagination" aria-hidden="true">
          <span className="review-bullet review-bullet-active" />
          <span className="review-bullet" />
        </div>
        <div className="reviews-slider-arrows" aria-hidden="true">
          <button type="button" tabIndex={-1}>
            Previous
          </button>
          <button type="button" tabIndex={-1}>
            Next
          </button>
        </div>
      </div>
    </section>
  );
}

function Comparison() {
  const nexubis = [
    "Direct access to multiple specialised skill sets",
    "Dedicated project manager",
    "Dynamic retainers based on client requirements",
    "Daily updates via private client slack channels",
  ];
  const others = [
    "Junior or secretly offshoring work",
    'Tedious "Requests" or Lengthy briefs',
    "Never-ending subscription or long contracts",
    "Slow progress or rushed results",
  ];

  return (
    <section className="section usp-section">
      <div className="site-container">
        <div className="section-heading centered">
          <div className="avatar-stack">
            {[
              "avatar-1.png",
              "avatar-2.png",
              "avatar-4.png",
              "avatar-3.png",
            ].map((avatar) => (
              <img key={avatar} src={`/assets/images/${avatar}`} alt="" />
            ))}
          </div>
          <h2>Limitless Creativity, Powered by a Dedicated Team</h2>
        </div>

        <div className="comparison-card">
          <div className="comparison-column">
            <NexubisLogo className="comparison-logo" />
            <CheckList items={nexubis} red />
          </div>
          <div className="comparison-column">
            <h3>Other agencies</h3>
            <CheckList items={others} />
          </div>
        </div>
      </div>
    </section>
  );
}

function CheckList({ items, red = false }: { items: string[]; red?: boolean }) {
  return (
    <ul className={red ? "check-list red" : "check-list"}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function Steps() {
  return (
    <section className="section steps-section">
      <div className="site-container">
        <div className="section-heading centered">
          <Eyebrow icon="process">Process</Eyebrow>
          <h2>Our 4 step plan to a project you’re proud of</h2>
        </div>

        <div className="steps-grid">
          {steps.map((step, index) => (
            <article className="step-card" key={index}>
              <div className="step-card-header">
                <h3>{step.title}</h3>
                <span>{String(index + 1).padStart(2, "0")}</span>
              </div>
              <div className="step-card-body">
                <img
                  className="step-bg"
                  src="/assets/images/card-bg-mark.webp"
                  alt=""
                />
                <img
                  className="step-img"
                  src={`/assets/images/${step.image}`}
                  alt=""
                />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section className="section faq-section">
      <div className="site-container faq-layout">
        <div className="faq-intro">
          <h2>What would you like to know about Nexubis?</h2>
          <p>
            We&apos;re here to help! Explore our FAQs to learn more about our
            services, process, and how we can bring your vision to life.
          </p>
        </div>

        <div className="faq-list">
          {faqs.map(([question, answer]) => (
            <details key={question}>
              <summary>
                <span>{question}</span>
                <svg className="chevron" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m19.5 8.25-7.5 7.5-7.5-7.5" />
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

function CloudCta() {
  return (
    <section className="cloud-cta">
      <div className="site-container">
        <h2>Empowering</h2>
        <h2>Dreams.</h2>
      </div>
      <div className="clouds" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, index) => (
          <img key={index} src="/assets/images/clouds_1.avif" alt="" />
        ))}
      </div>
    </section>
  );
}
