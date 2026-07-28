"use client";

// The one and only way tooltip content renders on the packages page. With no
// comparison table, each tip carries a detail a buyer needs.
//
// Built on Radix Tooltip, which is purpose-built for this: it opens on hover after
// a short delay and on keyboard focus, closes on leave, blur and Escape, portals
// the panel so card overflow cannot clip it, and places it collision-aware (flips
// near the viewport top, shifts to stay on screen so the rightmost card's tip never
// runs off a 375px viewport). Radix also wires the trigger's accessible description
// to the panel automatically, so a screen reader reads the tip on focus.
//
// (An earlier controlled-Popover version was replaced: Popover is a click pattern,
// and driving it from hover fought Radix's own dismissal, so tips never opened.)

import * as Tooltip from "@radix-ui/react-tooltip";

const OPEN_DELAY = 120;

export function InfoTip({ label, tip }: { label: string; tip: string }) {
  return (
    <Tooltip.Provider delayDuration={OPEN_DELAY} skipDelayDuration={0}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button type="button" className="pkg-infotip-trigger" aria-label={`More about: ${label}`}>
            <span aria-hidden="true" className="pkg-infotip-glyph">
              i
            </span>
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content className="pkg-infotip-panel" side="top" align="center" sideOffset={8} collisionPadding={12}>
            {tip}
            <Tooltip.Arrow className="pkg-infotip-arrow" width={12} height={6} />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}