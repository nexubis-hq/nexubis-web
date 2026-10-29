"use client";
import { useRef, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
export function ActivityFilters() {
  const panel = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (panel.current && !panel.current.contains(event.target as Node))
        panel.current.open = false;
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && panel.current) panel.current.open = false;
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, []);
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
    <details ref={panel} className="sc-admin-filterpanel">
      <summary className="btn btn-secondary">Filters &#9662;</summary>
      <div className="sc-admin-filterfields">
        {(
          [
            [
              "source",
              "Traffic",
              [
                ["ad", "From ads"],
                ["other", "Other"],
              ],
            ],
            [
              "period",
              "Period",
              [
                ["14", "14 days"],
                ["7", "7 days"],
                ["30", "30 days"],
              ],
            ],
            [
              "runs",
              "Runs",
              [
                ["all", "All"],
                ["problems", "Problems only"],
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
          Show tests
        </label>
      </div>
    </details>
  );
}
