"use client";

import { useState } from "react";

export function CopyLinkButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-secondary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(`${window.location.origin}${path}`);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1800);
        } catch {
          // Clipboard blocked: the public-report link next to this button works.
        }
      }}
    >
      {copied ? "Copied" : "Copy report link"}
    </button>
  );
}
