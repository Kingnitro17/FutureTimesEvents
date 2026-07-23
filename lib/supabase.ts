import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL  || 'https://ecbbmcqwluivbzlaqdsd.supabase.co';
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYmJtY3F3bHVpdmJ6bGFxZHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NjEyNzcsImV4cCI6MjA5MzMzNzI3N30.XTTs7RN-SrZ0YnC20m8mZms8ZfVVeANJgvwg1Key6SQ';

export const supabase = createClient(supabaseUrl, supabaseKey);
export default supabase;
