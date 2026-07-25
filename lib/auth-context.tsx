'use client';
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import type { User, DbProfile, UserRole } from '@/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  profileError: string | null;
  signIn:  (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp:  (email: string, password: string, userData: Partial<User>) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isOrganizer: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Lazy singleton for the Supabase browser client.
 *  Calling getSupabaseBrowserClient() at module level would trigger
 *  getPublicSupabaseConfig() eagerly, failing at build time or when
 *  .env.local is missing during static prerendering.
 */
let _supabaseClient: ReturnType<typeof getSupabaseBrowserClient> | null = null;
function getClient() {
  if (!_supabaseClient) {
    _supabaseClient = getSupabaseBrowserClient();
  }
  return _supabaseClient;
}

function normaliseRole(role: DbProfile['role'] | string | undefined): UserRole {
  if (role === 'organizer') return 'event_manager';
  if (role === 'user' || !role) return 'attendee';
  if (['attendee', 'host', 'event_manager', 'admin', 'super_admin'].includes(role)) {
    return role as UserRole;
  }
  return 'attendee';
}

/** Map profiles row → UI User */
function mapProfile(p: DbProfile): User {
  return {
    id:             p.id,
    name:           p.display_name || p.email.split('@')[0],
    email:          p.email,
    avatar:         p.avatar_url  || '',
    avatarColor:    p.avatar_color || '#7B61FF',
    initials:       p.initials    || p.display_name?.slice(0, 2).toUpperCase() || 'FT',
    bio:            p.bio         || '',
    location:       p.location    || '',
    joinedAt:       p.created_at  || new Date().toISOString(),
    loyaltyPoints:  p.loyalty_points  ?? 0,
    eventsAttended: p.events_attended ?? 0,
    totalSpent:     Number(p.total_spent) || 0,
    isVip:          p.is_vip      ?? false,
    role:           normaliseRole(p.role),
    badges:         [],
  };
}

/** Fallback: build User from Supabase auth metadata when profiles row is missing */
function userFromAuth(authUser: { id: string; email?: string; user_metadata?: Record<string, unknown> }): User {
  const meta = authUser.user_metadata ?? {};
  const name = (meta.name as string) || authUser.email?.split('@')[0] || 'User';
  return {
    id: authUser.id, name, email: authUser.email ?? '',
    avatar: '', avatarColor: '#7B61FF',
    initials: name.slice(0, 2).toUpperCase(),
    bio: '', location: '', joinedAt: new Date().toISOString(),
    loyaltyPoints: 0, eventsAttended: 0, totalSpent: 0, isVip: false,
    role: normaliseRole(meta.role as string | undefined),
    badges: [],
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,      setUser]      = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const supabase = getClient();

  const ensureProfile = useCallback(async (
    userId: string,
    email: string,
    userData: Partial<User>
  ) => {
    const display_name = userData.name || email.split('@')[0];
    const sb = getClient();

    try {
      const { data: existing, error: profileLookupError } = await sb
        .rpc('get_my_profile');

      if (existing) return;
      if (profileLookupError) {
        throw new Error(profileLookupError.message);
      }

      const { error } = await sb.from('profiles').insert({
        id:           userId,
        email,
        display_name,
        initials:     display_name.slice(0, 2).toUpperCase(),
        avatar_url:   '',
        avatar_color: '#7B61FF',
      });

      if (error && error.code !== '23505') {
        throw new Error(error.message);
      }
    } catch (err) {
      console.error('[Auth] profile bootstrap failed:', err);
      setProfileError(
        'Your account profile could not be verified. Refresh after the database access migration is applied.',
      );
    }
  }, []);

  const loadProfile = useCallback(async (
    userId: string,
    authUser: { id: string; email?: string; user_metadata?: Record<string, unknown> }
  ) => {
    const sb = getClient();

    try {
      const { data, error } = await sb.rpc('get_my_profile');

      if (data && !error) {
        const p = data as unknown as DbProfile;
        if (p.id !== userId) {
          throw new Error('The profile response did not match the authenticated user.');
        }
        if (p.account_status && p.account_status !== 'active') {
          setUser(userFromAuth(authUser));
          setProfileError('This account is not active. Contact a platform administrator.');
          return;
        }
        const meta = authUser.user_metadata ?? {};
        const realName = (meta.full_name as string) || (meta.name as string);

        // Self-heal: If the database is stuck with the email prefix as the name, but we have their real name from Google/OAuth, fix it.
        if (realName && p.display_name === authUser.email?.split('@')[0]) {
          p.display_name = realName;
          // Fire-and-forget update to fix it permanently in the DB
          sb.from('profiles').update({ display_name: realName }).eq('id', userId).then();
        }

        setUser(mapProfile(p));
        setProfileError(null);
      } else {
        // RPC returned null/error — fall back to a direct profile query.
        // The RPC may not return data if migration 007's function signature
        // is slightly different, but the RLS "profiles_own_read" policy
        // (from 007) allows the user to read their own row directly.
        const { data: directProfile, error: directError } = await sb
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (directProfile && !directError) {
          const p = directProfile as unknown as DbProfile;
          if (p.account_status && p.account_status !== 'active') {
            setUser(userFromAuth(authUser));
            setProfileError('This account is not active. Contact a platform administrator.');
            return;
          }
          setUser(mapProfile(p));
          setProfileError(null);
          return;
        }

        // Both RPC and direct query failed — emit a clear error
        const rpcMessage = error?.message || 'RPC returned no data.';
        const directMessage = directError?.message || 'Direct profile query returned no data.';
        console.error('[Auth] profile verification failed. RPC:', rpcMessage, 'Direct:', directMessage);
        setProfileError(
          'Your account is signed in, but its organizer permissions could not be verified.',
        );

        // Fallback: use auth metadata if profile fetch fails
        setUser(userFromAuth(authUser));
      }
    } catch (err) {
      console.error('[Auth] Error loading profile:', err);
      setProfileError(
        'Your account is signed in, but its organizer permissions could not be verified.',
      );
      setUser(userFromAuth(authUser));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const syncAuthState = useCallback(async (session: { user?: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null } | null) => {
    if (session?.user) {
      // Ensure profile row exists first, then load the full profile
      const email = session.user.email || '';
      const meta = session.user.user_metadata ?? {};
      await ensureProfile(session.user.id, email, {
        name: (meta.name as string) || (meta.full_name as string),
      });
      await loadProfile(session.user.id, session.user);
    } else {
      setUser(null);
      setProfileError(null);
      setIsLoading(false);
    }
  }, [ensureProfile, loadProfile]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }: { data: { session: { user?: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null } | null } }) => {
      if (mounted) void syncAuthState(data.session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_: string, session: { user?: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null } | null) => {
      if (!mounted) return;
      void syncAuthState(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [syncAuthState]);

  async function signIn(email: string, password: string) {
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setUser(null);
      setProfileError(null);
      setIsLoading(false);
      return { error: error as Error | null };
    }

    // If we got a session back, load the profile immediately
    // This prevents the race where the page redirects before onAuthStateChange fires
    if (data.session?.user) {
      const email = data.session.user.email || '';
      const meta = data.session.user.user_metadata ?? {};
      await ensureProfile(data.session.user.id, email, {
        name: (meta.name as string) || (meta.full_name as string),
      });
      await loadProfile(data.session.user.id, data.session.user);
    }

    return { error: null };
  }

  async function signUp(email: string, password: string, userData: Partial<User>) {
    const { error, data } = await supabase.auth.signUp({
      email, password,
      // Role metadata is deliberately fixed for public sign-up. Elevated roles
      // are granted in the database by an existing administrator.
      options: { data: { name: userData.name, role: 'attendee' } },
    });

    if (error) {
      setUser(null);
      setProfileError(null);
      setIsLoading(false);
      return { error: error as Error | null };
    }

    // If we got a session back (email confirmation disabled), load the profile immediately
    if (data.session?.user) {
      const email = data.session.user.email || '';
      const meta = data.session.user.user_metadata ?? {};
      await ensureProfile(data.session.user.id, email, {
        name: (meta.name as string) || (meta.full_name as string),
      });
      await loadProfile(data.session.user.id, data.session.user);
    }

    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfileError(null);
    setIsLoading(false);
  }

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isOrganizer = user?.role === 'event_manager' || isAdmin;

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      profileError,
      signIn,
      signUp,
      signOut,
      isAdmin,
      isOrganizer,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
