-- Add weekly_schedule column
alter table public.profiles
  add column weekly_schedule jsonb;
