# Potential future style shift — Scorecard "dark glass" restyle

> Status: **parked / not incorporated.** Explored 2026-07-09 on the Scorecard
> page (`/scorecard`) only. Reverted from `app/globals.css` after review; kept
> here so it can be picked back up later.

## The look

A darker, moodier take on the Scorecard entry page:

- **Background:** `#14262C` (dark teal / petrol) instead of the site `--work-black`.
- **Accent:** `#E90F00` (red-orange) instead of the site red `--primary`.
- **Navigation:** a floating, frosted-glass pill that hovers below the top edge —
  translucent blurred background, hairline outline, light text/logo, button-radius
  corners. The accent "Book" button stays solid.
- **Orb glow:** the two red corner orbs are softer — more blur, roughly half the
  intensity — so they read as a gentle wash rather than a bright bloom.
- **No hard cut-off:** the landing background (and its glow) runs up *under* the
  floating nav so there's no visible seam below the header.

Earlier colour tests in the same slot, for reference:
`#293133` (RAL 7016 anthracite) bg + `#D6301F` accent.

## How it was done (all scoped to `.sc-entry`, so the rest of the site is untouched)

Everything below was added/changed in `app/globals.css`. To re-apply, paste the
new rules back and re-do the two orb tweaks.

### 1. Scoped colour tokens + red-fill catch

```css
.sc-entry {
  /* dark teal bg + red-orange accent, scoped to the scorecard page */
  --work-black: #14262c;
  --primary: #e90f00;
  background: var(--work-black);
}

/* recolour hardcoded-red SVG fills (e.g. the logo mark) to match the accent */
.sc-entry [fill="#FF4141"],
.sc-entry [fill="#ff4141"] {
  fill: var(--primary);
}
```

### 2. Floating frosted-glass nav

```css
.sc-entry .site-header {
  top: 0;
  background: transparent;
  box-shadow: none;
  padding-top: 1rem;
}

.sc-entry .nav-container {
  padding: 0.55rem 1.6rem;
  border-radius: var(--button-radius); /* button-style, not a big pill */
  background: color-mix(in srgb, var(--work-black) 55%, transparent);
  border: 1px solid rgb(255 255 255 / 14%);
  box-shadow:
    0 16px 40px rgb(0 0 0 / 38%),
    inset 0 1px 0 rgb(255 255 255 / 8%);
  backdrop-filter: blur(16px) saturate(1.3);
  -webkit-backdrop-filter: blur(16px) saturate(1.3);
}

.sc-entry .nav-menu,
.sc-entry .nav-link {
  color: rgb(255 255 255 / 82%);
}

.sc-entry .nav-menu-links {
  border-left-color: rgb(255 255 255 / 18%);
}

.sc-entry .nav-link:hover,
.sc-entry .nav-link:focus-visible,
.sc-entry .desktop-case-studies:has(.desktop-dropdown-open) > .nav-link {
  color: #fff;
}

/* logo wordmark white on the glass; the mark keeps the accent */
.sc-entry .nav-logo path[fill="#292d32"] {
  fill: #fff;
}
```

### 3. Landing runs up under the nav (kills the hard cut-off)

The header is ~82px and in flow, so the landing (which holds the glow) otherwise
starts below it. Pull it up and re-pad so content clears the floating nav:

```css
.sc-entry .sc-landing {
  margin-top: -5.125rem;
  padding-top: calc(var(--s-7) / 2 + 1rem + 5.125rem);
  min-height: 100svh;
}
```

### 4. Softer orbs

In the existing `.sc-landing::before, .sc-landing::after` rule:

- `filter: blur(36px)` → `filter: blur(64px)`
- `opacity: 0.85` → `opacity: 0.42`

And in `.sc-landing::after`:

- `opacity: 0.7` → `opacity: 0.35`

## Notes / caveats before shipping it later

- The glass nav's light text and the orb tweaks assume the **dark** background —
  they're a package; don't apply piecemeal on a light bg.
- Only the **desktop** nav pill was styled. The mobile menu panel still uses the
  original treatment and would need its own glass pass.
- All of it keys off the `.sc-entry` class, so it stays contained to the
  Scorecard entry page and never touches the homepage or the report pages.
