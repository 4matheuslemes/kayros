create table public.outline_presentations (
  id          uuid primary key default gen_random_uuid(),
  outline_id  uuid not null references public.outlines(id) on delete cascade,
  date        date not null,
  occasion    text,
  created_at  timestamptz not null default now()
);
alter table public.outline_presentations enable row level security;
create policy "outline_presentations: owner via outline, with talks access"
  on public.outline_presentations for all to authenticated
  using (public.has_talks_access() and exists (
    select 1 from public.outlines o where o.id = outline_id and o.user_id = auth.uid()))
  with check (public.has_talks_access() and exists (
    select 1 from public.outlines o where o.id = outline_id and o.user_id = auth.uid()));
