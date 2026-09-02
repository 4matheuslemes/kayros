-- Add is_admin column
alter table public.profiles
  add column is_admin boolean not null default false;
