-- Fix for Organizers/Admins to create their own events
-- Run this in your Supabase Dashboard SQL Editor

-- 1. Allow organizers to insert events
CREATE POLICY "Organizers can insert their own events" ON public.events
FOR INSERT
WITH CHECK (
  auth.uid() = organizer_id
  AND (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('organizer', 'admin')))
);

-- 2. Allow organizers to update their own events
CREATE POLICY "Organizers can update their own events" ON public.events
FOR UPDATE
USING (
  auth.uid() = organizer_id
  AND (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('organizer', 'admin')))
)
WITH CHECK (
  auth.uid() = organizer_id
);

-- 3. Allow organizers to delete their own events
CREATE POLICY "Organizers can delete their own events" ON public.events
FOR DELETE
USING (
  auth.uid() = organizer_id
  AND (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('organizer', 'admin')))
);

-- 4. Ensure events storage bucket exists and has correct policies
INSERT INTO storage.buckets (id, name, public) VALUES ('events', 'events', true) ON CONFLICT DO NOTHING;

-- Storage Policy: Allow authenticated users to upload event images
CREATE POLICY "Anyone can upload an event image" ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'events' AND auth.role() = 'authenticated');

-- Storage Policy: Allow public to read event images
CREATE POLICY "Anyone can view event images" ON storage.objects
FOR SELECT
USING (bucket_id = 'events');

-- Storage Policy: Allow users to update their own images
CREATE POLICY "Users can update own event images" ON storage.objects
FOR UPDATE
USING (bucket_id = 'events' AND auth.uid() = owner)
WITH CHECK (bucket_id = 'events' AND auth.uid() = owner);

-- Storage Policy: Allow users to delete their own images
CREATE POLICY "Users can delete own event images" ON storage.objects
FOR DELETE
USING (bucket_id = 'events' AND auth.uid() = owner);
