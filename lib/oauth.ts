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
  if (!origin) throw new Error('Google sign-in must be started in a browser.');

  const redirectUrl = new URL(`${origin}/auth/callback`);
  if (nextPath?.startsWith('/') && !nextPath.startsWith('//')) {
    redirectUrl.searchParams.set('next', nextPath);
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl.toString(),
      queryParams: {
        prompt: 'select_account',
      },
    },
  });

  if (error) throw error;
}
