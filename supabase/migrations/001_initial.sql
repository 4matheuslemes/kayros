-- ═══════════════════════════════════════════════════════════
-- Kairós — Initial Database Migration
-- Run this in the Supabase SQL Editor (Project → SQL Editor → New query)
-- ═══════════════════════════════════════════════════════════

-- ─── Extensions ─────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─── Enums ──────────────────────────────────────────────────

create type activity_category as enum (
  'convencional',
  'testemunho_publico',
  'ldc',
  'carta'
);

create type activity_source as enum (
  'timer',
  'manual'
);

create type contact_status as enum (
  'revisita',
  'estudo_ativo'
);

-- ─── profiles ────────────────────────────────────────────────
-- Created automatically when a user signs up (via trigger below)

create table if not exists public.profiles (
  id                        uuid primary key references auth.users(id) on delete cascade,
  full_name                 text not null default '',
  congregation_name         text,
  monthly_goal_hours        integer not null default 50,
  service_year_start_month  integer not null default 9,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- ─── daily_records ───────────────────────────────────────────

create table if not exists public.daily_records (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  date              date not null,
  duration_minutes  integer not null check (duration_minutes > 0),
  category          activity_category not null default 'convencional',
  source            activity_source not null default 'manual',
  notes             text not null default '',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists daily_records_user_date_idx on public.daily_records (user_id, date);

-- ─── contacts ────────────────────────────────────────────────

create table if not exists public.contacts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  address     text not null default '',
  phone       text not null default '',
  interests   text not null default '',
  status      contact_status not null default 'revisita',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists contacts_user_id_idx on public.contacts (user_id);

-- ─── visit_history ───────────────────────────────────────────

create table if not exists public.visit_history (
  id               uuid primary key default gen_random_uuid(),
  contact_id       uuid not null references public.contacts(id) on delete cascade,
  visit_date       date not null,
  notes            text not null default '',
  next_visit_date  date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists visit_history_contact_id_idx on public.visit_history (contact_id);
create index if not exists visit_history_next_visit_idx on public.visit_history (next_visit_date);

-- ─── updated_at trigger ──────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace trigger set_daily_records_updated_at
  before update on public.daily_records
  for each row execute function public.set_updated_at();

create or replace trigger set_contacts_updated_at
  before update on public.contacts
  for each row execute function public.set_updated_at();

create or replace trigger set_visit_history_updated_at
  before update on public.visit_history
  for each row execute function public.set_updated_at();

-- ─── Auto-create profile on signup ───────────────────────────

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Row Level Security ──────────────────────────────────────

alter table public.profiles      enable row level security;
alter table public.daily_records enable row level security;
alter table public.contacts      enable row level security;
alter table public.visit_history enable row level security;

-- profiles
create policy "profiles: own row"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- daily_records
create policy "daily_records: own rows"
  on public.daily_records for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- contacts
create policy "contacts: own rows"
  on public.contacts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- visit_history (join via contacts)
create policy "visit_history: own rows via contact"
  on public.visit_history for all
  using (
    exists (
      select 1 from public.contacts c
      where c.id = contact_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.contacts c
      where c.id = contact_id
        and c.user_id = auth.uid()
    )
  );
