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
  const [clientError, setClientError] = useState(false);

  const syncAuthState = useCallback(
    async (session: { user?: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null } | null) => {
      if (!session?.user) {
        setUser(null);
        setProfileError(null);
        setIsLoading(false);
        return;
      }

      const authUser = session.user;
      const email = authUser.email || '';
      const meta = authUser.user_metadata ?? {};

      // Render profile shell immediately using auth metadata to ensure instant initial loading
      setUser(current => (current?.id === authUser.id ? current : userFromAuth(authUser)));
      setIsLoading(false);

      try {
        const sb = getClient();
        let profileRow: DbProfile | null = null;

        // Try single profile fetch via get_my_profile RPC
        const { data: rpcData, error: rpcError } = await sb.rpc('get_my_profile');
        if (rpcData && !rpcError) {
          profileRow = rpcData as unknown as DbProfile;
        } else {
          // Direct read fallback if RPC is unconfigured
          const { data: directData } = await sb
            .from('profiles')
            .select('id,email,display_name,avatar_url,avatar_color,initials,bio,location,created_at,loyalty_points,events_attended,total_spent,is_vip,role,account_status')
            .eq('id', authUser.id)
            .maybeSingle();
          if (directData) {
            profileRow = directData as unknown as DbProfile;
          }
        }

        if (profileRow) {
          if (profileRow.account_status && profileRow.account_status !== 'active') {
            setUser(userFromAuth(authUser));
            setProfileError('This account is not active. Contact a platform administrator.');
            return;
          }
          const realName = (meta.full_name as string) || (meta.name as string);
          if (realName && profileRow.display_name === email.split('@')[0]) {
            profileRow.display_name = realName;
            void sb.from('profiles').update({ display_name: realName }).eq('id', authUser.id);
          }
          setUser(mapProfile(profileRow));
          setProfileError(null);
        } else {
          // Idempotent bootstrap for newly authenticated user missing a profile row
          const displayName = (meta.name as string) || (meta.full_name as string) || email.split('@')[0] || 'User';
          const { error: insertError } = await sb.from('profiles').insert({
            id: authUser.id,
            email,
            display_name: displayName,
            initials: displayName.slice(0, 2).toUpperCase(),
            avatar_url: '',
            avatar_color: '#7B61FF',
          });

          if (!insertError || insertError.code === '23505') {
            const { data: newProfile } = await sb
              .from('profiles')
              .select('id,email,display_name,avatar_url,avatar_color,initials,bio,location,created_at,loyalty_points,events_attended,total_spent,is_vip,role,account_status')
              .eq('id', authUser.id)
              .maybeSingle();
            if (newProfile) {
              setUser(mapProfile(newProfile as unknown as DbProfile));
              setProfileError(null);
            }
          }
        }
      } catch (err) {
        console.error('[Auth] Error loading profile:', err);
      }
    },
    [],
  );

  useEffect(() => {
    let mounted = true;

    try {
      const sb = getClient();
      const { data: { subscription } } = sb.auth.onAuthStateChange(
        (_: string, session: { user?: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null } | null) => {
          if (!mounted) return;
          void syncAuthState(session);
        },
      );

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    } catch {
      queueMicrotask(() => {
        if (mounted) setClientError(true);
      });
    }
  }, [syncAuthState]);

  if (clientError) {
    return (
      <div className="page-offset flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md rounded-[var(--r-3xl)] border border-amber-500/30 bg-[var(--bg-card)] p-8 text-center shadow-[var(--shadow-card)]">
          <h1 className="text-2xl font-bold text-[var(--text)]">
            Supabase configuration needed
          </h1>
          <p className="mt-3 text-[var(--text-muted)] text-sm leading-relaxed">
            NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be
            set in your .env.local file. Copy .env.example to .env.local and
            fill in your Supabase project values.
          </p>
          <p className="mt-4 text-xs text-[var(--text-muted)]">
            This only affects local development — on Vercel production these
            values are set via the project environment variables dashboard.
          </p>
        </div>
      </div>
    );
  }

  async function signIn(email: string, password: string) {
    const { error, data } = await getClient().auth.signInWithPassword({ email, password });

    if (error) {
      setUser(null);
      setProfileError(null);
      setIsLoading(false);
      return { error: error as Error | null };
    }

    if (data.session?.user) {
      void syncAuthState(data.session);
    }

    return { error: null };
  }

  async function signUp(email: string, password: string, userData: Partial<User>) {
    const { error, data } = await getClient().auth.signUp({
      email, password,
      options: { data: { name: userData.name, role: 'attendee' } },
    });

    if (error) {
      setUser(null);
      setProfileError(null);
      setIsLoading(false);
      return { error: error as Error | null };
    }

    if (data.session?.user) {
      void syncAuthState(data.session);
    }

    return { error: null };
  }

  async function signOut() {
    await getClient().auth.signOut();
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
