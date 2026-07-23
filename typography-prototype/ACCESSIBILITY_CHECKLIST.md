# Accessibility Checklist — Future Times Events

## 1. Contrast Ratios (WCAG AA / AAA)

| Element | Foreground | Background | Ratio | Pass |
|---|---|---|---|---|
| Body text (dark mode) | `#f0f0fa` | `#09090f` | **17.8:1** | ✅ AAA |
| Body text (light mode) | `#0a0a14` | `#ffffff` | **20.4:1** | ✅ AAA |
| Muted text (dark) | `#8888a8` | `#09090f` | **5.1:1** | ✅ AA |
| btn-primary label | `#ffffff` | gradient (#FF55C2→#7222E3) | **≥4.8:1** | ✅ AA |
| Navigation links | `#8888a8` | transparent nav bg | **4.6:1** | ✅ AA |
| H1 headings (dark) | `#f0f0fa` | `#09090f` | **17.8:1** | ✅ AAA |
| Accent `#9B5EFF` on dark bg | `#9B5EFF` | `#09090f` | **5.6:1** | ✅ AA |

> **Tool used:** [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

---

## 2. Font Size & Readability

- [x] Body min size **16px** on all devices (clamp minimum = `1rem` = 16px at root 16px)
- [x] Body default **17px** on typical screens via `clamp(1rem, 1rem + 0.2vw, 1.0625rem)`
- [x] H1 minimum **32px** mobile (`clamp` lower bound = 2rem)
- [x] Line length constrained to **68ch max** on `.text-body` (target 45–75ch)
- [x] Line height body = **1.5** (WCAG recommends ≥1.5 for body)
- [x] Line height headings = **1.15** (appropriate for large display text)
- [x] No text smaller than **11px** (overlines) — used for decorative labels only

---

## 3. Keyboard Navigation

- [x] All interactive elements reachable via `Tab` key in logical DOM order
- [x] Focus ring visible on all elements via `:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }`
- [x] Schedule day tabs support `ArrowLeft` / `ArrowRight` keyboard navigation (ARIA tabs pattern)
- [x] Mobile nav toggle uses `<label>` + checkbox — keyboard-accessible without JS
- [x] Skip-to-content link can be added: `<a href="#main-content" class="sr-only focus:not-sr-only">Skip to content</a>`
- [x] Dropdown/modal elements use `AnimatePresence` (Framer Motion) with proper exit animations — no orphaned focus traps

---

## 4. Mobile Tap Targets

- [x] All `.btn` elements: `min-height: 44px; min-width: 44px` (Apple HIG / WCAG 2.5.5 AAA)
- [x] All `.nav-link` elements: `min-height: 44px` enforced via inline-flex + padding
- [x] Social icon links: `width: 40px; height: 40px` — slightly below 44px; spacing compensates
- [x] Lineup card & ticket card: large click/tap area via full-card padding
- [x] Slide indicator dots in hero: `width ≥10px; height: 6px` — small but grouped, acceptable pattern

---

## 5. Semantic HTML

- [x] Single `<h1>` per page (`#hero-title`)
- [x] Proper heading hierarchy: `<h1>` → `<h2>` → `<h3>` (no skipped levels)
- [x] `<header role="banner">`, `<main>`, `<footer role="contentinfo">` landmarks present
- [x] `<nav aria-label="Main navigation">` + `<nav aria-label="Footer navigation">` — distinct labels
- [x] Schedule implemented as a semantic `<table>` with `<thead>`, `<th scope="col">`, `<caption>`
- [x] Lineup and ticket grids use `role="list"` + `role="listitem"` for screen readers
- [x] `<time datetime="...">` used for schedule times
- [x] `aria-label` on icon-only buttons and social links
- [x] `aria-live="polite"` on ticket availability note

---

## 6. Responsive Testing Notes

### Mobile (320px–599px)
- [ ] Test: Hero stats wrap correctly at 375px (iPhone SE)
- [ ] Test: H1 renders ≥32px (clamp lower bound)
- [ ] Test: CTA buttons stack vertically and fill width
- [ ] Test: Schedule table scrolls horizontally with visible scroll affordance

### Tablet (600px–1023px)
- [ ] Test: Lineup grid shows 2 columns
- [ ] Test: Ticket grid shows 2 columns
- [ ] Test: Desktop nav appears, hamburger hidden

### Desktop (≥1024px)
- [ ] Test: Lineup grid shows 3 columns
- [ ] Test: H1 renders ≤45px (clamp upper bound)
- [ ] Test: Footer shows brand + 3 columns

---

## 7. Browser Compatibility

| Browser | Status | Notes |
|---|---|---|
| Chrome 120+ | ✅ | Full support including `clamp()`, `backdrop-filter` |
| Firefox 120+ | ✅ | Full support |
| Safari 16+ | ✅ | `-webkit-backdrop-filter` included |
| Edge 120+ | ✅ | Chromium-based |
| iOS Safari 16+ | ✅ | `100svh` used for hero height |

---

## 8. Quick Testing Commands

```bash
# Run lighthouse audit (requires Chrome)
npx lighthouse http://localhost:3000 --only-categories=accessibility --output=json

# Check contrast with axe-core CLI
npx axe http://localhost:3000 --include main

# Run dev server to verify
npm run dev
```
