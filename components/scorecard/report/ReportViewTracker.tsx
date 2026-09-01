"use client";

// Fires the ReportViewed event when a generated report has rendered. Mounted
// by the report page (client child of a server page), so "rendered" means the
// page hydrated with the full result in the DOM. Guarded per slug per page
// load: strict-mode double-mounts and client-side re-renders never
// double-count, while a genuine revisit (new page load) counts again, like a
// page view.
import { useEffect } from "react";
import { trackMeta } from "@/lib/meta/track";
import { META_EVENTS } from "@/lib/meta/events";

const firedSlugs = new Set<string>();

export function ReportViewTracker({ slug, company }: { slug: string; company: string }) {
  useEffect(() => {
    if (firedSlugs.has(slug)) return;
    firedSlugs.add(slug);
    trackMeta(META_EVENTS.reportViewed, { content_category: "scorecard", content_name: company, slug });
  }, [slug, company]);
  return null;
}
