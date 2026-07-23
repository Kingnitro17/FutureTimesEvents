-- migrations/003_profiles_rls_fix.sql
-- Fix: Allow authenticated users to INSERT and UPDATE their own profile row.
-- Without these policies, the signup profile insert silently fails,
-- causing the organizer role to never persist in the database.
-- Idempotent: safe to run multiple times.

-- Allow users to insert their own profile row on signup
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Also allow anon to insert (needed during signup when session isn't fully established yet)
DROP POLICY IF EXISTS "Anon can insert profile on signup" ON public.profiles;
CREATE POLICY "Anon can insert profile on signup"
  ON public.profiles FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow service_role full access (already bypasses RLS, but explicit for clarity)
DROP POLICY IF EXISTS "Service role full access profiles" ON public.profiles;
CREATE POLICY "Service role full access profiles"
  ON public.profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
