-- Migration 012: Core tables for talks and bible study module
-- Requires: public.has_talks_access() from migration 011

create table public.bible_verses (
  id          bigint generated always as identity primary key,
  book_number smallint not null,
  book_name   text not null,
  chapter     smallint not null,
  verse       smallint not null,
  text        text not null,
  text_search tsvector generated always as (to_tsvector('portuguese', text)) stored
);
create index bible_verses_lookup_idx on public.bible_verses (book_number, chapter, verse);
create index bible_verses_text_search_idx on public.bible_verses using gin (text_search);

alter table public.bible_verses enable row level security;
create policy "bible_verses: read with talks access"
  on public.bible_verses for select to authenticated
  using (public.has_talks_access());

create table public.outlines (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  category    text,
  content     jsonb,
  word_count  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index outlines_user_updated_idx on public.outlines (user_id, updated_at desc);

create trigger set_outlines_updated_at
  before update on public.outlines
  for each row execute function public.set_updated_at();

alter table public.outlines enable row level security;
create policy "outlines: own rows with talks access"
  on public.outlines for all to authenticated
  using (auth.uid() = user_id and public.has_talks_access())
  with check (auth.uid() = user_id and public.has_talks_access());
