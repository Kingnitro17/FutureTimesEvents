# Future Times Events — Agent Rules & Architecture
<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.4, App Router |
| Runtime | React 19.2.4 |
| Language | TypeScript 5.x (strict — `ignoreBuildErrors: false`) |
| Styling | Tailwind CSS v4 + vanilla CSS tokens (`app/globals.css`) |
| Database | Supabase (Postgres + Auth + RLS) |
| Deployment | Netlify + @netlify/plugin-nextjs |
| QR Scanning | @zxing/browser (camera) |
| QR Rendering | qrcode library |
| Validation | Zod (server-side API routes) |
| Animations | Framer Motion |
| Icons | lucide-react |
| Maps | Leaflet + react-leaflet (no API key) |

---

## Key Commands

```bash
npm run dev      # Start development server (Turbopack)
npm run build    # Production build (TypeScript errors WILL fail the build)
npm run lint     # ESLint
npm run type-check  # tsc --noEmit
```

---

## Supabase Client Rules

**CRITICAL: Use the right client for the right context.**

| Context | Import |
|---------|--------|
| Client components | `import { getSupabaseBrowserClient } from '@/lib/supabase/browser'` |
| Server components / API routes | `import { createSupabaseServerClient } from '@/lib/supabase/server'` |
| Admin operations (capacity, check-in) | `import { getSupabaseAdminClient } from '@/lib/supabase/admin'` |
| Legacy compatibility | `import { supabase } from '@/lib/supabase'` (browser alias) |

**NEVER:**
- Import admin client in client components
- Expose `SUPABASE_SERVICE_ROLE_KEY` to the browser
- Call `supabase.auth.getSession()` server-side — always use `auth.getUser()`
- Store raw QR tokens in the database — only store SHA-256 hashes

---

## QR Token Security Model

```
Server generates:
  rawToken = crypto.randomBytes(32).toString('base64url')   ← 256-bit entropy
  tokenHash = sha256(rawToken).hex                          ← stored in DB

DB stores only: qr_token_hash (never rawToken)

rawToken is returned ONCE to client in the claim API response.
Client stores it in sessionStorage for ticket view.
rawToken is NEVER logged, NEVER re-stored, NEVER sent to DB.

Scan flow:
  Scanner → presents rawToken → API → sha256(rawToken) → DB lookup → atomic lock
```

---

## Database Migrations

All migrations live in `supabase/migrations/`.
Migrations are numbered and ordered: `001_`, `002_`, etc.
Run migrations in the Supabase SQL Editor manually — NEVER run automatically.

**Migration approval required before running any migration.**

---

## Atomic Functions (Postgres)

Two critical SECURITY DEFINER functions:
- `claim_ticket_atomic(...)` — atomic capacity enforcement + idempotency
- `verify_and_checkin(...)` — atomic check-in with row lock

Both are called via admin client (service role) after application-level auth checks.
Results are JSON objects with a `result` field. Always handle all result codes.

---

## Route Architecture

```
/                    → Homepage (public)
/events              → Events listing (public, real Supabase data)
/events/[slug]       → Event detail + ticket claim (public)
/ticket/[ticketId]   → Ticket view + QR display (auth or sessionStorage token)
/auth/login          → Login (Supabase Auth)
/auth/signup         → Signup
/auth/callback       → OAuth callback
/tickets             → Ticket wallet (auth required)
/checkin             → Host scanner (host/admin only)
/admin               → Admin dashboard (admin/super_admin only)
/api/tickets/claim   → POST: atomic ticket claim (server)
/api/scan            → POST: atomic check-in (server, auth required)
/api/health          → GET: health check (no auth)
```

---

## Role Hierarchy

```
super_admin  → can do everything, including delete events and suspend users
admin        → can manage all events, tickets, staff, and view all data
event_manager → can manage assigned events and their tickets
host         → can scan tickets for assigned events only
attendee     → can view own tickets, claim tickets, update own profile
```

---

## FORBIDDEN ACTIONS

- ❌ Never store raw QR tokens in any database column
- ❌ Never use `ignoreBuildErrors: true` in next.config.ts
- ❌ Never import admin client in client components (`'use client'`)
- ❌ Never log or persist the raw QR token beyond the single API response
- ❌ Never show "valid" scan result without server confirmation
- ❌ Never allow offline check-in — always require network for scan verification
- ❌ Never directly update ticket status from client code — always use /api/scan
- ❌ Never skip Zod validation on API routes
- ❌ Never use mock data in production paths — keep mockData.ts in lib/dev/ only
- ❌ Never run migrations without human review and approval

---

## Design System

Brand gradients (use these, not ad-hoc colors):
```css
--grad-primary:  linear-gradient(135deg, #FF55C2, #7222E3)  /* default */
--grad-ocean:    linear-gradient(135deg, #2CC4EA, #533885)
--grad-emerald:  linear-gradient(135deg, #46FFAB, #A02EFF)
--grad-fire:     linear-gradient(135deg, #FFBC73, #FF00B9)
--grad-electric: linear-gradient(135deg, #1D5BFF, #C7FE17)
--grad-cosmic:   linear-gradient(135deg, #DD1FFF, #24D8FB)
```

Typography:
- Headings: Space Grotesk (font-display)
- Body: Inter (font-body / font-sans)
- Subheadings: Raleway (font-sub)

Spacing: strict 8px grid (--sp-1 through --sp-8)

---

## Git Workflow

- Main branch: `main` (protected — no direct pushes)
- Development branch: `dev_mode`
- Never push directly to `main`
- All production changes go through PR from `dev_mode`
- Author: Kingnitro17

---

## Security Checklist (Before Every PR)

- [ ] No secrets in code or commits
- [ ] All API routes have Zod validation
- [ ] Admin client not used in client components
- [ ] RLS policies cover all new tables
- [ ] Rate limiting on user-facing API routes
- [ ] Security headers present in next.config.ts
- [ ] No mock data in production code paths
- [ ] TypeScript errors = 0
- [ ] `npm run build` passes
