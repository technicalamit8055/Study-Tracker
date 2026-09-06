-- ============================================================================
-- ExamRoadmap — Supabase schema for cloud progress sync
--
-- Run this once in your Supabase project:
--   Dashboard → SQL Editor → New query → paste → Run
--
-- One row per (user, exam), so switching roadmaps never mixes progress.
-- Row Level Security means the browser's public anon key can only ever touch
-- the signed-in user's own rows — no server-side API layer is required.
-- ============================================================================

create table if not exists public.user_progress (
  id           uuid        default gen_random_uuid() primary key,
  user_id      uuid        references auth.users(id) on delete cascade not null,
  exam_id      text        not null,
  user_state   jsonb       default '{}'::jsonb,
  stats        jsonb       default '{}'::jsonb,
  timer        jsonb       default '{}'::jsonb,
  last_updated timestamptz default now(),
  unique (user_id, exam_id)
);

-- The client always queries by (user_id, exam_id); the unique constraint above
-- already provides that index. This one speeds up "all my exams" listings.
create index if not exists user_progress_user_id_idx
  on public.user_progress (user_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.user_progress enable row level security;

drop policy if exists "Users can manage own progress" on public.user_progress;

create policy "Users can manage own progress"
  on public.user_progress
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Keep last_updated honest even if a client forgets to send it.
-- ---------------------------------------------------------------------------
create or replace function public.touch_user_progress()
returns trigger
language plpgsql
as $$
begin
  new.last_updated = now();
  return new;
end;
$$;

drop trigger if exists user_progress_touch on public.user_progress;

create trigger user_progress_touch
  before insert or update on public.user_progress
  for each row execute function public.touch_user_progress();

-- ---------------------------------------------------------------------------
-- Optional: mirror the onboarding profile (goal, target date, daily hours) so
-- it follows the student across devices. The app works without this table.
-- ---------------------------------------------------------------------------
create table if not exists public.user_profiles (
  user_id      uuid        references auth.users(id) on delete cascade primary key,
  profile      jsonb       default '{}'::jsonb,
  last_updated timestamptz default now()
);

alter table public.user_profiles enable row level security;

drop policy if exists "Users can manage own profile" on public.user_profiles;

create policy "Users can manage own profile"
  on public.user_profiles
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================
-- Enabling Google 1-Click Sign-In
--
-- 1. Google Cloud Console → APIs & Services → Credentials
--      → Create Credentials → OAuth client ID → Web application
-- 2. Authorised redirect URI (copy exactly, from your Supabase dashboard):
--      https://<your-project-ref>.supabase.co/auth/v1/callback
-- 3. Copy the Client ID and Client Secret.
-- 4. Supabase Dashboard → Authentication → Providers → Google
--      → Enable, paste Client ID + Secret → Save.
-- 5. Supabase Dashboard → Authentication → URL Configuration
--      → Site URL:      http://localhost:3005   (and your production URL)
--      → Redirect URLs: http://localhost:3005, https://your-domain.com
--
-- Email/password sign-up works with no extra setup. To skip the confirmation
-- email while testing: Authentication → Providers → Email → turn off
-- "Confirm email".
-- ============================================================================
