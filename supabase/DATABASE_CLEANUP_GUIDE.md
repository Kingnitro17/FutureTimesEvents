# Database Cleanup & Alick Macheso & Peter Moyo Show Setup Guide

## Overview
This guide will help you remove all dummy events and users from your Supabase backend and add a single real event for Alick Macheso & Peter Moyo Live concert.

## Prerequisites
- Access to your Supabase project dashboard
- Your admin account email: `nigelmarara0@gmail.com`
- SQL Editor access in Supabase

## Database Schema Overview

Your database has the following main tables:

### Core Tables
- **profiles** - User profiles (extends Supabase auth.users)
- **events** - Event listings
- **ticket_tiers** - Ticket pricing tiers for events
- **tickets** - Purchased tickets
- **attendees** - Event RSVPs/attendance
- **bookings** - Table reservations
- **orders** - Bottle service orders
- **analytics** - Event analytics data
- **notifications** - User notifications
- **comments** - Event comments
- **saved_events** - User-saved events

### Key Relationships
- `events.organizer_id` → `profiles.id`
- `tickets.event_id` → `events.id`
- `tickets.tier_id` → `ticket_tiers.id`
- `tickets.user_id` → `profiles.id`
- `ticket_tiers.event_id` → `events.id`

## Step-by-Step Instructions

### Step 1: Access Supabase SQL Editor

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project: `ecbbmcqwluivbzlaqdsd`
3. Navigate to **SQL Editor** in the left sidebar
4. Click **"New Query"** to open a new SQL editor tab

### Step 2: Backup Current Data (Optional but Recommended)

Before deleting anything, create a backup:

```sql
-- Export all current data to CSV (run each separately)
SELECT * FROM public.events;
SELECT * FROM public.profiles;
SELECT * FROM public.tickets;
SELECT * FROM public.ticket_tiers;
```

Click the "Download as CSV" button for each result to save backups locally.

### Step 3: Run Cleanup Script

1. Open the file: `supabase/cleanup_dummy_data.sql`
2. Copy the entire SQL script
3. Paste it into the Supabase SQL Editor
4. Click **"Run"** to execute

**What this does:**
- Deletes all tickets, ticket tiers, bookings, orders, analytics
- Deletes all attendees, saved events, notifications, comments
- Deletes ALL events
- Deletes all profiles EXCEPT your admin account (`nigelmarara0@gmail.com`)

**Verification:**
After running, execute these queries to verify cleanup:

```sql
-- Should return 0
SELECT COUNT(*) FROM public.events;

-- Should return 1 (your admin account)
SELECT COUNT(*) FROM public.profiles;

-- Should return 0
SELECT COUNT(*) FROM public.tickets;
```

### Step 4: Add Alick Macheso & Peter Moyo Show

1. Open the file: `supabase/add_liquid_lounge_event.sql`
2. Copy the entire SQL script
3. Paste it into a new SQL Editor tab
4. Click **"Run"** to execute

**What this does:**
- Creates a new event: "Alick Macheso & Peter Moyo Live"
- Sets date: Wednesday, August 20, 2026 at 6 PM
- Venue: HICC (Harare International Conference Centre)
- Creates 1 FREE ticket tier:
  - General Admission: FREE (2000 available)
  - QR ticket for instant access
  - Downloadable and retrievable (like Eventbrite)
- Sets organizer to your admin account
- Marks event as featured (will appear on hero page)

**Verification:**
After running, execute these queries to verify:

```sql
-- Should return the Alick Macheso & Peter Moyo event
SELECT id, title, slug, date, time, venue, status 
FROM public.events 
WHERE slug = 'alick-macheso-peter-moyo-live';

-- Should return 1 ticket tier (FREE)
SELECT id, name, price, available, total 
FROM public.ticket_tiers 
WHERE event_id = (SELECT id FROM public.events WHERE slug = 'alick-macheso-peter-moyo-live');

-- Should return 1 total event
SELECT COUNT(*) FROM public.events;
```

### Step 5: Verify in Your Application

1. Start your dev server: `npm run dev`
2. Navigate to `http://localhost:3000`
3. Go to the events page or map
4. Verify "Alick Macheso & Peter Moyo Live" appears on the hero page (featured)
5. Click on the event to view details
6. Check that the FREE ticket tier is displayed correctly
7. Test the ticket claim flow to ensure QR generation works

## Customization Options

### Modify Event Details
Edit `add_liquid_lounge_event.sql` to customize:

- **Date/Time:** Change the `date`, `time`, `end_time`, `starts_at`, `ends_at` fields
- **Venue:** Update `venue`, `address`, `city`, `lat`, `lng`
- **Lineup:** Update the `lineup` array with actual artist names
- **Capacity:** Adjust `capacity` and ticket tier `available`/`total` counts
- **Images:** Replace `image_url` and `social_image_url` with actual event images
- **Featured:** Set `featured = true` to appear on hero page, `false` for regular listing

### Add More Events
Duplicate the event INSERT block in `add_liquid_lounge_event.sql` with:
- Different `slug` (must be unique)
- Different event details
- Different ticket tiers

## Important Notes

### Safety Precautions
- The cleanup script DELETES data permanently
- Always backup before running cleanup
- Run in a transaction (scripts use BEGIN/COMMIT)
- Your admin account is preserved during cleanup

### Foreign Key Constraints
The cleanup script deletes data in the correct order to respect foreign key constraints:
1. Dependent data first (tickets, bookings, etc.)
2. Events second
3. Profiles last (except admin)

### Event Status
The Liquid Lounge event is created with `status = 'published'`, making it immediately visible on the site.

### Organizer Assignment
The event is automatically assigned to your admin account (`nigelmarara0@gmail.com`). If this email doesn't exist in your profiles table, you'll need to update the `organizer_id` and `created_by` fields with a valid profile UUID.

## Troubleshooting

### Script Fails with "foreign key violation"
- Ensure you ran the cleanup script first
- Check that dependent data was deleted before events

### Event doesn't appear on site
- Verify `status = 'published'`
- Verify `featured = true` for hero page appearance
- Check the date is in the future
- Ensure your application is fetching from the correct table

### Organizer ID is NULL
- Run: `SELECT id, email FROM public.profiles WHERE email = 'nigelmarara0@gmail.com';`
- If no results, your admin profile doesn't exist - create it first
- Update the script with the correct profile UUID

### Slug conflict
- If you've run the script before, the `ON CONFLICT (slug) DO NOTHING` prevents duplicates
- To update an existing event, use `ON CONFLICT (slug) DO UPDATE` instead

### QR Ticket Not Generating
- Ensure your ticket claim flow is implemented
- Check that the `qr_code` field is being populated in the tickets table
- Verify the QR generation library is properly installed

## Files Created

1. **supabase/cleanup_dummy_data.sql** - Removes all dummy data
2. **supabase/add_liquid_lounge_event.sql** - Adds Alick Macheso & Peter Moyo show
3. **supabase/DATABASE_CLEANUP_GUIDE.md** - This guide

## Next Steps

After completing this setup:

1. Test the event creation flow in your admin panel
2. Test the FREE ticket claim flow (ensure QR generation works)
3. Upload actual event images to your storage bucket
4. Update event details with real artist information
5. Test ticket retrieval/download functionality
6. Add more events as needed using the same pattern

## Support

If you encounter issues:
- Check Supabase logs in the dashboard
- Verify table permissions in Authentication > Policies
- Ensure your admin account has the correct role (admin/super_admin)
