-- ═══════════════════════════════════════════════════════════
-- Kairós — Shepherding Visits (Pastoreio) Migration
-- Run this in the Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- 1. Add is_elder column to public.profiles
alter table public.profiles
  add column if not exists is_elder boolean not null default false;

-- 2. Create public.shepherding_visits table
create table if not exists public.shepherding_visits (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  family_or_person  text not null,           -- nome da família/pessoa visitada
  visit_date        date not null,
  companion         text,                    -- quem acompanhou (outro ancião/servo ministerial)
  next_visit_date   date,                    -- follow-up, se combinado
  report            text,                    -- relatório livre da visita, texto corrido, campo único e grande
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- 3. Enable Row Level Security
alter table public.shepherding_visits enable row level security;

-- 4. Strictly own rows policy — no exceptions for is_admin
drop policy if exists "shepherding_visits: strictly own rows, no exceptions" on public.shepherding_visits;

create policy "shepherding_visits: strictly own rows, no exceptions"
  on public.shepherding_visits for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 5. Performance index on user_id and visit_date
create index if not exists shepherding_visits_user_date_idx
  on public.shepherding_visits (user_id, visit_date desc);
