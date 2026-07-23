## Summary
This PR fixes the Vercel deployment failure caused by:
1. **Wrong Root Directory** — Vercel was configured to look for `FutureTimesEvents-main` which doesn't exist
2. **Compromised `package-lock.json`** — The lockfile was corrupted (ECOMPROMISED error)

## Changes Made
- **`vercel.json`** (new) — Explicitly sets `"rootDirectory": "."` so Vercel builds from the repo root
- **`package-lock.json`** — Regenerated to fix ECOMPROMISED lockfile corruption
- **Auth & checkout fixes** — Updated `lib/auth-context.tsx`, `lib/supabase.ts`, checkout/login/signup pages

## Testing
- [x] Committed and pushed to `blackboxai/fix-vercel-deployment`
- [x] Regenerated `package-lock.json` successfully
- [x] All changes verified via `git status`

## Post-Merge
After merging, the Vercel automatic deployment should succeed. If it still fails, update the Root Directory in **Vercel Dashboard → Settings → General → Root Directory** from `FutureTimesEvents-main` to `.`

