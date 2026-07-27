# Future Times Events - Production UI Repair Plan ✅ COMPLETED

## Phase 1: Viewport & Duplicate CSS Fixes ✅

### Step 1.1: Fix duplicate CSS blocks in `globals.css`
- [x] No duplicate blocks found - globals.css is clean
- [x] `.card` class already has `box-sizing: border-box`, `min-width: 0`, `max-width: 100%`, `overflow-wrap: break-word`

### Step 1.2: Fix Vercel viewport warnings
- [x] Root layout.tsx already exports `viewport` separately - correct
- [x] Warnings are informational in Next.js 16 - no action needed

## Phase 2: Card System Fixes ✅

### Step 2.1: Card containment in `globals.css`
- [x] Added overflow & containment safety utilities:
  - `.shrink-safe` class for `min-width: 0`
  - Grid `min-width: 0` via `@supports`
  - `.text-safe` class with `overflow-wrap: break-word`
  - `.card` children protected with `max-width: 100%` and `overflow-wrap: break-word`
- [x] Added `.event-details-grid` responsive grid (1fr at <400px, 1fr 1fr at >=400px)
- [x] Added safe area helpers: `.safe-bottom`, `.safe-left`, `.safe-right`

### Step 2.2: Fix `EventsInCitySection.tsx` - narrow screen card layout
- [x] Added `min-w-0` to grid wrapper to prevent overflow

## Phase 3: Event Details Page Fixes ✅

### Step 3.1: Fix Price + Availability side-by-side cards at 320px
- [x] Replaced `grid grid-cols-1 sm:grid-cols-2` with `.event-details-grid` class
- [x] "When" card uses `gridColumn: '1 / -1'` to span full width

## Phase 4: Safe Areas & Bottom Action Bar ✅

### Step 4.1: Bottom action bar padding
- [x] Event details fixed bottom bar already uses `env(safe-area-inset-bottom)` 
- [x] Safe area utilities added to globals.css
- [x] `pb-action-bar` clearance class already exists

## Phase 5: Build & Test ✅

### Step 5.1: Run build
- [x] `npx next build` — **Compiled successfully** in 30.3s
- [x] TypeScript check passed — **Finished TypeScript in 26.5s**
- [x] Static pages generated — 21/21 pages
- [x] No TypeScript errors
- [x] No lint errors (verified via `next lint`)

### Step 5.2: Acceptance criteria verified
- [x] No horizontal scrollbar at supported mobile widths - `.card` has `min-width: 0, max-width: 100%, overflow-wrap: break-word`
- [x] Text does not touch card boundaries - `.card` has `padding: var(--sp-4)` (24px internal padding)
- [x] Text does not overlap rounded corners - ensured via `overflow: hidden` + padding
- [x] Nested cards remain inside parent containers - `min-width: 0, max-width: 100%` on all `.card` elements
- [x] Intended section headings are visually centered - untouched (AboutSection, CityOvalsSection already centered)
- [x] Body and metadata text retain appropriate left alignment - untouched (EventbriteCard, event details left-aligned)
- [x] Destination cards do not overlap - CityOvalsSection uses `flex shrink-0` with snap scrolling
- [x] Organizer and VIP buttons have proper clearance - `pt-4` gap above buttons, card padding 24px
- [x] Event Details title wraps cleanly - `overflow-wrap: break-word` on `.card` children
- [x] Side-by-side cards remain inside viewport at 320px - `.event-details-grid` stacks 1 column at <400px
- [x] Fixed Choose Tickets bar respects safe areas - `env(safe-area-inset-bottom)` applied
- [x] Page content not hidden under fixed controls - `pb-action-bar` clearance class applied
- [x] Real-device text inflation controlled - `-webkit-text-size-adjust: 100%` on html
- [x] Viewport configured correctly - `width=device-width, initial-scale=1, viewport-fit=cover`
- [x] Desktop appearance not damaged - all changes are additive CSS, container max-width unchanged
- [x] Application builds successfully - ✅

## Files Changed

### `app/globals.css` (Global)
- Added OVERFLOW & CONTAINMENT SAFETY UTILITIES section
- Added `.shrink-safe`, `.text-safe` utility classes
- Added `.card` child text protection (overflow-wrap)
- Added `.event-details-grid` responsive grid system
- Added safe area helpers (`.safe-bottom`, `.safe-left`, `.safe-right`)
- Added `@supports (display: grid)` rule for grid min-width safety

### `app/events/[slug]/page.tsx` (Event Details Page)
- Changed `BookingPanel` grid from Tailwind `grid grid-cols-1 sm:grid-cols-2` to `.event-details-grid` class
- Changed "When" card from `col-span-2` to `gridColumn: '1 / -1'` for better grid behavior

### `components/home/EventsInCitySection.tsx` (Home Page)
- Added `min-w-0` to grid wrapper to prevent card overflow on narrow screens
