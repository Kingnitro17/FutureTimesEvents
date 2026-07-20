/**
 * Supabase client barrel.
 * Client components: import from '@/lib/supabase/browser'
 * Server components / routes: import from '@/lib/supabase/server'
 * Admin operations (server-only): import from '@/lib/supabase/admin'
 *
 * Legacy alias kept for backward compatibility with existing pages
 * that do `import { supabase } from '@/lib/supabase'`.
 * Existing client components still work; new code should import from
 * the specific module.
 */
export { getSupabaseBrowserClient as supabase } from './browser';
export { createSupabaseServerClient } from './server';
export { getSupabaseAdminClient } from './admin';
