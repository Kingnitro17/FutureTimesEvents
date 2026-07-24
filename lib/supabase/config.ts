const PLACEHOLDER_MARKERS = ['your_project', 'your-project', 'replace_me', 'changeme'];

function requirePublicEnv(name: 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_ANON_KEY') {
  const value =
    name === 'NEXT_PUBLIC_SUPABASE_URL'
      ? process.env.NEXT_PUBLIC_SUPABASE_URL
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!value || PLACEHOLDER_MARKERS.some((marker) => value.toLowerCase().includes(marker))) {
    throw new Error(
      `[supabase/config] ${name} is required. Copy .env.example to .env.local and use your Supabase project values.`
    );
  }

  return value;
}

/**
 * Returns the public Supabase connection values used by browser and SSR clients.
 * There are intentionally no production fallbacks: a local build must never
 * silently connect to the live ticket database.
 */
export function getPublicSupabaseConfig() {
  const url = requirePublicEnv('NEXT_PUBLIC_SUPABASE_URL');
  const anonKey = requirePublicEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error('[supabase/config] NEXT_PUBLIC_SUPABASE_URL must be a valid URL.');
  }

  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    throw new Error('[supabase/config] NEXT_PUBLIC_SUPABASE_URL must use http or https.');
  }

  return { url: parsedUrl.toString().replace(/\/$/, ''), anonKey };
}
