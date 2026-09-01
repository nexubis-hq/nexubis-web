"use client";

// A "What is working" / "What to fix" list that collapses its tail behind a
// "View more (N)" button, LekkeWeb-style. Server parents pass plain data;
// only the expand state lives here.
import { useState } from "react";
import type { ReportListItem } from "@/lib/scorecard/report-derive";

const VISIBLE = 3;

export function CollapsibleList({ items, tone }: { items: ReportListItem[]; tone: "working" | "fix" }) {
  const [expanded, setExpanded] = useState(false);
  if (items.length === 0) return null;
  const shown = expanded ? items : items.slice(0, VISIBLE);
  const hidden = items.length - VISIBLE;
  return (
    <div className={`sc-checklist sc-checklist-${tone}`}>
      <p className="sc-checklist-tag">
        <span>{tone === "working" ? "What is working" : "What to fix"}</span>
      </p>
      <ul>
        {shown.map((i) => (
          <li key={i.key}>
            <span className="sc-checklist-title">{i.title}</span>
            <span className="sc-checklist-body">{i.body}</span>
          </li>
        ))}
        {!expanded && hidden > 0 ? (
          <li className="sc-checklist-more">
            <button type="button" onClick={() => setExpanded(true)}>
              View more ({hidden})
            </button>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
