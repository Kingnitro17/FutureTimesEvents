'use client';
import { supabase } from '@/lib/supabase';

/**
 * Initiates a Google OAuth sign-in flow via Supabase.
 * After the OAuth redirect, Supabase calls /auth/callback which
 * exchanges the code for a session.
 *
 * Usage:
 *   const { signInWithGoogle } = useOAuthSignIn();
 *   <button onClick={signInWithGoogle}>Sign in with Google</button>
 */
export async function signInWithGoogle(nextPath?: string): Promise<void> {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const redirectUrl = new URL(`${origin}/auth/callback`);
  if (nextPath) {
    redirectUrl.searchParams.set('next', nextPath);
  }

  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl.toString(),
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });
}
