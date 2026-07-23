# Future Times Events — Typography System

> **Status:** Live in production (`app/globals.css`) and mirrored in `typography-prototype/styles.css`.

---

## Font Stack

| Role | Font | Weights | CSS Variable |
|---|---|---|---|
| Body | Inter | 400 / 500 / 600 / 700 | `--font-body` |
| Headings (H1) | Space Grotesk | 700 | `--font-heading` |
| Sub-headings (H2/H3) | Raleway | 600 | `--font-sub` |

Loaded via `next/font/google` in `app/layout.tsx` with `font-display: swap`.

---

## Type Scale

```css
:root {
  --base-size:    16px;
  --body-size:    clamp(1rem, 1rem + 0.2vw, 1.0625rem);   /* 16–17px */
  --h1-size:      clamp(2rem, 3.5vw + 1.5rem, 2.8125rem); /* 32–45px */
  --h2-size:      clamp(1.375rem, 2.2vw + 1rem, 1.75rem); /* 22–28px */
  --h3-size:      clamp(1.25rem, 1.5vw + 0.75rem, 1.5rem);/* 20–24px */
  --caption-size: clamp(0.875rem, 0.5vw + 0.75rem, 1rem); /* 14–16px */
}
```

---

## Native Element Defaults (No Child Left Behind)

All `h1`–`h6` elements automatically receive the correct font family, size, weight, and line-height **without needing a class**:

```css
h1 { font-family: var(--font-heading); font-size: var(--h1-size); font-weight: 700; }
h2 { font-family: var(--font-sub);     font-size: var(--h2-size); font-weight: 600; }
h3 { font-family: var(--font-sub);     font-size: var(--h3-size); font-weight: 600; }
h4 { font-family: var(--font-body);    font-size: clamp(1rem,1vw+0.75rem,1.125rem); }
p  { font-family: var(--font-body);    font-size: var(--body-size); max-inline-size: 72ch; }
```

---

## Utility Classes

| Class | Use |
|---|---|
| `.h1` | Explicit H1 style on any element |
| `.h2` | Explicit H2 style on any element |
| `.h3` | Explicit H3 style on any element |
| `.text-body` | Body paragraph with 72ch line-length cap |
| `.caption` | 14–16px label / meta text, weight 500 |
| `.type-overline` | 11px uppercase, weight 700, letter-spacing 0.12em |
| `.section-title` | Two-line section header wrapper (overline + h2) |
| `.btn-primary` | Gradient CTA — passes WCAG AA |
| `.btn-outline` | Ghost button |
| `.btn-nav` | Navigation link — min 16px, weight 600 |

### Section Title Pattern

```html
<div class="section-title">
  <span class="overline">Browse by interest</span>
  <h2>Event Categories</h2>
</div>
```

---

## Spacing System (8px grid)

| Token | Value | Usage |
|---|---|---|
| `--sp-1` | 4px | Micro gaps |
| `--sp-2` | 8px | Icon gaps |
| `--sp-3` | 16px | Container padding mobile |
| `--sp-4` | 24px | Card padding, container padding 600px+ |
| `--sp-5` | 32px | Small section gap |
| `--sp-6` | 48px | Section padding mobile |
| `--sp-7` | 64px | Section padding `section-pad-sm` |
| `--sp-8` | 96px | Full section padding `section-pad` |

Classes: `.section-pad` (96px), `.section-pad-sm` (64px), `.section-pad-xs` (48px)

---

## Accessibility Checklist

- [x] Body text ≥ 16px on all devices (clamp floor = 1rem)
- [x] Contrast ratio: `#f0f0fa` on `#08080f` = **14.3:1** (AAA)
- [x] Contrast ratio: `#0a0a14` on `#ffffff` = **18.9:1** (AAA)
- [x] All interactive elements: `min-height: 44px; min-width: 44px`
- [x] Focus ring: `outline: 2px solid var(--accent); outline-offset: 2px`
- [x] Line-length: `max-inline-size: 72ch` on `.text-body` and `p`
- [x] `font-display: swap` on all Google Fonts
- [x] Keyboard navigation: tab, enter, arrow keys on all interactive elements
- [x] Schedule table: ARIA roles, `role="tablist"`, `aria-selected`
- [x] Hero: `aria-labelledby` on sections

---

## How to Change Fonts

1. **Swap body font:** Change `Inter` → your font in `app/layout.tsx` (next/font/google) and update `--font-body` in `:root`
2. **Swap heading font:** Change `Space_Grotesk` in layout.tsx and `--font-heading` in `:root`
3. **Adjust base size:** Change `--base-size` in `:root` (default `16px`) — all clamp values scale automatically

---

## How to Adjust Scale

All sizes use `clamp(min, preferred, max)`. To make headings larger on desktop:

```css
/* In globals.css :root — increase the max value */
--h1-size: clamp(2rem, 3.5vw + 1.5rem, 3.5rem); /* was 2.8125rem */
```

To make body text larger everywhere:
```css
--body-size: clamp(1.0625rem, 1rem + 0.3vw, 1.125rem); /* was max 1.0625rem */
```

---

## Files

| File | Purpose |
|---|---|
| `app/globals.css` | **Source of truth** — all tokens, components, utilities |
| `app/layout.tsx` | Google Fonts loading via next/font |
| `typography-prototype/styles.css` | Standalone CSS mirror (no Next.js dependency) |
| `typography-prototype/index.html` | Event landing page HTML prototype |

---

*Last updated: May 2026*
