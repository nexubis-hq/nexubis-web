// The /packages FAQ, the single source consumed by BOTH the visible accordion
// and the FAQPage JSON-LD, so the two can never drift. Prices in A1 are computed
// from lib/packages.ts, never typed as strings, so a price change can never leave
// a stale answer contradicting the cards above it.
//
// Answer-first throughout, by design. Order is money, then commitment, then
// process, then scope. Do not add warm-up sentences, soften openings or reorder.

import { type Currency, formatMoney, tierById } from "./packages";

export type FaqEntry = { q: string; a: string };

export function getPackagesFaq(currency: Currency): FaqEntry[] {
  const momentum = formatMoney(currency, tierById("momentum").monthly[currency]);
  const scale = formatMoney(currency, tierById("scale").monthly[currency]);
  const partner = formatMoney(currency, tierById("partner").monthly[currency]);

  return [
    {
      q: "How much does a Nexubis retainer cost?",
      a: `Three levels. Momentum is ${momentum} a month, Scale is ${scale}, and Partner is ${partner}. One flat fee, one invoice, no per-project quotes and no hourly billing. What changes between the levels is how much of your brand we take on, not how hard we work.`,
    },
    {
      q: "Why a monthly retainer instead of hourly or per project?",
      a: "Because hourly billing punishes us for getting faster, and it makes your costs impossible to plan. A flat monthly fee means you know the number before the month starts, we are free to do the thing that works rather than the thing that bills, and nobody spends Friday afternoon reconstructing a timesheet. It also means we are not negotiating a quote every time you need something, which is where most of the delay in agency work actually lives.",
    },
    {
      q: "What is the difference between Momentum, Scale and Partner?",
      a: "Momentum handles your website: development, maintenance, SEO, and the everyday design that goes with it. Scale adds the rest of your brand, so print, presentations, pitch decks, 3D and video all come from the same team and finally look like one company. Partner adds the brand itself, developed and kept consistent over time, campaigns going out the door, and a creative director who owns the whole picture.",
    },
    {
      q: "Is there anything cheaper than Momentum?",
      a: "No. Momentum is the entry level and it is priced at what a dedicated two-person team costs to run properly. We used to quote smaller custom arrangements and they did not work for either side, because the good version of this needs people who know your product, not a few hours borrowed from someone else's month. If Momentum is more than the work warrants right now, we will tell you that on the call rather than sell you a thinner version of it.",
    },
    {
      q: "How do the quarterly and yearly rates work?",
      a: "They are available on Partner only. Quarterly is 10% off, paid up front for the quarter. Yearly is two months free, paid up front for the year. Momentum and Scale are flat monthly rates with no prepayment option, because they are already priced at the level that keeps a dedicated team on your account.",
    },
    {
      q: "Why not just hire a designer in-house?",
      a: "For some companies that is the right answer, and we will say so. The difference is coverage. One in-house designer is one skillset, and the month you need 3D, motion, print, a website change and a campaign at the same time, you are briefing outside suppliers anyway. Every level here gives you a team across all of it, on a number you can compare directly against a single senior salary.",
    },
    {
      q: "How long am I committed for?",
      a: "Two months' notice. That is the whole commitment. Two months is also roughly what a clean handover of a website, brand files and live campaigns actually takes, so it works as a wind-down rather than a wall.",
    },
    {
      q: "What if my workload changes month to month?",
      a: "That is normal, and the retainer absorbs it. On Momentum, unused design requests roll over for as long as your retainer is active, so a quiet month is not money lost. Scale and Partner have no cap at all. If the change is permanent rather than seasonal, moving between levels is a conversation, not a renegotiation.",
    },
    {
      q: "How fast do you deliver, and how much can run at once?",
      a: "Most requests come back inside 72 hours on Momentum, and 48 hours on Scale and Partner, where your work is also picked up ahead of Momentum work. How much runs in parallel follows your team size: two people on Momentum, three on Scale, the full team on Partner. Anything genuinely urgent, flag it in your Slack channel and we will re-order the day.",
    },
    {
      q: "How do I get work to you?",
      a: "A dedicated Slack channel, which is how nearly everyone prefers it, or email if your team would rather. You get daily Loom updates, weekly progress notes and a monthly report, so you are never waiting on a status meeting to find out where something is.",
    },
    {
      q: "Do you build the website, or only design it?",
      a: "Both. Design, build and launch in Webflow, then every update, new page and bug fix afterwards. You never hand a design file to a separate developer and hope.",
    },
    {
      q: "Do I own the files and the website?",
      a: "Yes. Everything we make for you is yours, source files included, handed over through Figma and Webflow or whatever format your team works in. The only thing we keep is the right to show the work as a case study.",
    },
    {
      q: "Not sure which level is right for us?",
      a: "Book an application call and we will tell you honestly, including if the answer is not yet. We would rather point you to the level that actually fits, or say it is not the right time, than put you on the wrong one.",
    },
  ];
}