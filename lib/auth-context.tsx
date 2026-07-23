'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import type { User, DbProfile } from '@/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn:  (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp:  (email: string, password: string, userData: Partial<User>) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isOrganizer: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const supabase = getSupabaseBrowserClient();

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
    totalSpent:     Number(p.total_spent)  ?? 0,
    isVip:          p.is_vip      ?? false,
    role:           (p.role       || 'user') as User['role'],
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
    role: ((meta.role as string) || 'user') as User['role'],
    badges: [],
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,      setUser]      = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const syncAuthState = async (session: { user?: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null } | null) => {
      if (!mounted) return;
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
        setIsLoading(false);
      }
    };

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
  }, []);

  async function ensureProfile(
    userId: string,
    email: string,
    userData: Partial<User>
  ) {
    const display_name = userData.name || email.split('@')[0];

    try {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (existing) return;

      const { error } = await supabase.from('profiles').insert({
        id:           userId,
        email,
        display_name,
        initials:     display_name.slice(0, 2).toUpperCase(),
        role:         userData.role || 'user',
        avatar_url:   '',
        avatar_color: '#7B61FF',
      }).select().single();

      if (error && error.code !== '23505') {
        console.warn('[Auth] profile insert failed:', error.message);
      }
    } catch (err) {
      console.warn('[Auth] profile ensure failed:', err);
    }
  }

  async function loadProfile(
    userId: string,
    authUser: { id: string; email?: string; user_metadata?: Record<string, unknown> }
  ) {
    try {
      const { data, error, status } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (data && !error) {
        const p = data as DbProfile;
        const meta = authUser.user_metadata ?? {};
        const realName = (meta.full_name as string) || (meta.name as string);

        // Self-heal: If the database is stuck with the email prefix as the name, but we have their real name from Google/OAuth, fix it.
        if (realName && p.display_name === authUser.email?.split('@')[0]) {
          p.display_name = realName;
          // Fire-and-forget update to fix it permanently in the DB
          supabase.from('profiles').update({ display_name: realName }).eq('id', userId).then();
        }

        setUser(mapProfile(p));
      } else {
        // 404 = table missing, 406 / PGRST116 = no row yet — both are fine
        if (status !== 404 && status !== 406 && error?.code !== 'PGRST116') {
          console.warn('[Auth] profiles fetch:', error?.message);
        }

        // Fallback: use auth metadata if profile fetch fails
        setUser(userFromAuth(authUser));
      }
    } catch (err) {
      console.error('[Auth] Error loading profile:', err);
      // Fallback to user from auth metadata even if profile fetch fails
      setUser(userFromAuth(authUser));
    } finally {
      setIsLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setUser(null);
      setIsLoading(false);
      return { error: error as Error | null };
    }

    // Don't manually load profile here — onAuthStateChange will fire
    // which calls syncAuthState → ensureProfile + loadProfile.
    // Keep isLoading true until the listener resolves.
    return { error: null };
  }

  async function signUp(email: string, password: string, userData: Partial<User>) {
    const { error, data } = await supabase.auth.signUp({
      email, password,
      options: { data: { name: userData.name, role: userData.role || 'user' } },
    });

    if (error) {
      setUser(null);
      setIsLoading(false);
      return { error: error as Error | null };
    }

    // For sign-up with email confirmation enabled, Supabase may not
    // set a session immediately. That's fine — the user will verify email
    // then sign in. onAuthStateChange will handle it on sign-in.
    // Keep isLoading true until the listener resolves if session set.
    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setIsLoading(false);
  }

  const isAdmin     = user?.role === 'admin';
  const isOrganizer = user?.role === 'organizer' || isAdmin;

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signUp, signOut, isAdmin, isOrganizer }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
