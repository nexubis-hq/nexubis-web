import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ReportView } from "@/components/scorecard/report/ReportView";
import { readShared, incrementViews, type SharedScorecard } from "@/lib/scorecard/share";
import { SCORECARD_NAME } from "@/lib/scorecard/copy";
import type { ScorecardResult } from "@/lib/scorecard/result";

// Every view reads live KV state (Loom attach must appear without a rebuild),
// and slugs are unguessable, so nothing here prerenders.
export const dynamic = "force-dynamic";

// Dev-only demo record built from the recorded fixture, so the report renders
// locally without KV. Never available in production: the fixture names real
// (non-client) companies used for development only.
async function demoRecord(): Promise<SharedScorecard | null> {
  if (process.env.NODE_ENV === "production") return null;
  try {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const result = JSON.parse(
      readFileSync(join(process.cwd(), "lib/scorecard/fixtures/scorecard-result.json"), "utf8"),
    ) as ScorecardResult;
    return {
      prospectData: {
        name: "Alex",
        role: "Marketing manager",
        company: result.meta.company,
        url: "https://example.invalid",
        productOneLiner: result.meta.productOneLiner,
        competitors: result.meta.competitors.map((c) => ({ raw: c.name })),
      },
      result: { ...result, meta: { ...result.meta, contactName: "Alex" } },
      loomUrl: null,
      createdAt: new Date().toISOString(),
      lastEditedAt: new Date().toISOString(),
      expiresAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

async function loadRecord(slug: string): Promise<SharedScorecard | null> {
  if (slug === "demo") return demoRecord();
  try {
    return await readShared(slug);
  } catch {
    // KV unavailable: an honest failure page beats a broken one.
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const record = await loadRecord(slug);
  const company = record?.result.meta.company;
  return {
    title: company ? `${SCORECARD_NAME} for ${company}` : SCORECARD_NAME,
    description: "Your Credibility Score across the five places buyers look, benchmarked against the competitors you named.",
    // Shared reports are reachable by unguessable link only, never indexed.
    robots: { index: false, follow: false },
  };
}

export default async function SharedReportPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const record = await loadRecord(slug);
  if (!record) notFound();
  if (slug !== "demo") incrementViews(slug).catch(() => {});
  // Always the full report: the unlock gate is gone, and reports generated
  // before the gate was removed render identically under this layout.
  return <ReportView result={record.result} loomUrl={record.loomUrl} />;
}
