const PLACEHOLDER_MARKERS = ['your_project', 'your-project', 'replace_me', 'changeme'];

const BUILD_PLACEHOLDER_URL = 'https://placeholder.supabase.co';
const BUILD_PLACEHOLDER_KEY = 'placeholder_anon_key_for_build';

/**
 * Returns true when Next.js is running a production build (`next build`).
 * During builds, static pages like /_not-found are prerendered but never
 * execute Supabase queries. Skipping the env-var validation allows those
 * pages to compile without requiring every developer or CI system to set
 * Supabase credentials for a build that does not need them.
 */
function isBuildPhase(): boolean {
  return process.env.NEXT_PHASE === 'phase-production-build';
}

function requirePublicEnv(name: 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_ANON_KEY') {
  const value =
    name === 'NEXT_PUBLIC_SUPABASE_URL'
      ? process.env.NEXT_PUBLIC_SUPABASE_URL
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (
    (!value || PLACEHOLDER_MARKERS.some((marker) => value?.toLowerCase().includes(marker)))
    && !isBuildPhase()
  ) {
    throw new Error(
      `[supabase/config] ${name} is required. Copy .env.example to .env.local and use your Supabase project values.`
    );
  }

  return value;
}

/**
 * Returns the public Supabase connection values used by browser and SSR clients.
 *
 * During a production build (`next build`), if the environment variables are
 * not set, placeholder values are returned so that static-page prerendering
 * (e.g. /_not-found) does not fail. These placeholders are never used at
 * runtime because Vercel/server-side execution always has the real values.
 */
export function getPublicSupabaseConfig() {
  const rawUrl = requirePublicEnv('NEXT_PUBLIC_SUPABASE_URL');
  const anonKey = requirePublicEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  const url = rawUrl || (isBuildPhase() ? BUILD_PLACEHOLDER_URL : null);

  if (!url) {
    throw new Error(
      '[supabase/config] NEXT_PUBLIC_SUPABASE_URL is required. ' +
      'Copy .env.example to .env.local and use your Supabase project values.'
    );
  }

  const resolvedKey = anonKey || (isBuildPhase() ? BUILD_PLACEHOLDER_KEY : null);

  if (!resolvedKey) {
    throw new Error(
      '[supabase/config] NEXT_PUBLIC_SUPABASE_ANON_KEY is required. ' +
      'Copy .env.example to .env.local and use your Supabase project values.'
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    if (isBuildPhase()) {
      parsedUrl = new URL(BUILD_PLACEHOLDER_URL);
    } else {
      throw new Error('[supabase/config] NEXT_PUBLIC_SUPABASE_URL must be a valid URL.');
    }
  }

  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    if (isBuildPhase()) {
      parsedUrl = new URL(BUILD_PLACEHOLDER_URL);
    } else {
      throw new Error('[supabase/config] NEXT_PUBLIC_SUPABASE_URL must use http or https.');
    }
  }

  return { url: parsedUrl.toString().replace(/\/$/, ''), anonKey: resolvedKey };
}
