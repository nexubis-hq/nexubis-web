"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
export function LeadsFilters({ testCount }: { testCount: number }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const change = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`${path}?${next}`);
  };
  return (
    <details className="sc-admin-filterpanel">
      <summary className="btn btn-secondary">Filters</summary>
      <div className="sc-admin-filterfields">
        {(
          [
            [
              "status",
              "Status",
              [
                ["all", "All"],
                ["action", "Needs action"],
                ["ready", "Report ready"],
                ["failed", "Scan failed"],
                ["hand", "Made by hand"],
              ],
            ],
            [
              "qualified",
              "Qualified",
              [
                ["any", "Any"],
                ["yes", "Yes"],
                ["no", "No"],
              ],
            ],
            [
              "source",
              "Source",
              [
                ["any", "Any"],
                ["ad", "From ads"],
                ["other", "Other"],
              ],
            ],
            [
              "period",
              "Period",
              [
                ["30", "30 days"],
                ["7", "7 days"],
                ["all", "All time"],
              ],
            ],
          ] as const
        ).map(([key, label, options]) => (
          <label className="sc-field" key={key}>
            <span>{label}</span>
            <select
              value={params.get(key) || options[0][0]}
              onChange={(e) => change(key, e.target.value)}
            >
              {options.map(([value, text]) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
            </select>
          </label>
        ))}
        <label>
          <input
            type="checkbox"
            checked={params.get("showTests") === "1"}
            onChange={(e) => change("showTests", e.target.checked ? "1" : "")}
          />{" "}
          Show tests ({testCount})
        </label>
      </div>
    </details>
  );
}
