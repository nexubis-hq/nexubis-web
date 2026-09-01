import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { readShared } from "@/lib/scorecard/share";
import { VERDICT_LABELS } from "@/lib/scorecard/scoring";
import { prospectScores } from "@/lib/scorecard/result";
import { SCORECARD_NAME, POWERED_BY } from "@/lib/scorecard/copy";

export const alt = "The Online Credibility Audit";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Repo brand tokens, hardcoded here only because CSS variables cannot reach
// the OG renderer. Values mirror app/globals.css :root exactly.
const TOKENS = {
  primary: "#ff4141",
  black: "#1d1c1a",
  workBlack: "#0f0f0f",
  surface: "#f2f2f2",
  mid: "#888680",
  white: "#ffffff",
};

function loadFont(file: string): Buffer | null {
  try {
    return readFileSync(join(process.cwd(), "lib/scorecard/og-fonts", file));
  } catch {
    return null;
  }
}

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const record = slug === "demo" ? null : await readShared(slug).catch(() => null);
  const company = record?.result.meta.company ?? null;
  const overall = record ? (prospectScores(record.result)?.overall ?? null) : null;
  const band = record?.result.verdict.band ?? null;

  const helvetica = loadFont("HelveticaNowDisplay-Medium.ttf");
  const inter = loadFont("Inter-Regular.ttf");
  const fonts = [
    ...(helvetica ? [{ name: "Helvetica Now Display", data: helvetica, weight: 500 as const }] : []),
    ...(inter ? [{ name: "Inter", data: inter, weight: 400 as const }] : []),
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: TOKENS.workBlack,
          color: TOKENS.white,
          padding: 64,
          fontFamily: inter ? "Inter" : "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 14, height: 44, background: TOKENS.primary, display: "flex" }} />
            <div style={{ fontSize: 30, color: TOKENS.surface, display: "flex" }}>{SCORECARD_NAME}</div>
          </div>
          <div style={{ fontSize: 22, color: TOKENS.mid, display: "flex" }}>{POWERED_BY}</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 56 }}>
          {overall !== null ? (
            <div
              style={{
                width: 220,
                height: 220,
                borderRadius: 110,
                border: `10px solid ${TOKENS.primary}`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{ fontSize: 84, fontFamily: helvetica ? "Helvetica Now Display" : undefined, display: "flex" }}>{overall}</div>
              <div style={{ fontSize: 22, color: TOKENS.mid, display: "flex" }}>of 100</div>
            </div>
          ) : (
            <div style={{ width: 220, height: 220, borderRadius: 110, border: `10px solid ${TOKENS.primary}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: 48, fontFamily: helvetica ? "Helvetica Now Display" : undefined, display: "flex" }}>?</div>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 720 }}>
            <div style={{ fontSize: 56, lineHeight: 1.1, fontFamily: helvetica ? "Helvetica Now Display" : undefined, display: "flex" }}>
              {company ?? "How credible is your brand, really?"}
            </div>
            {band ? <div style={{ fontSize: 32, color: TOKENS.primary, display: "flex" }}>{VERDICT_LABELS[band]}</div> : null}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 24, color: TOKENS.mid, display: "flex" }}>nexubis.io</div>
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length ? fonts : undefined },
  );
}
