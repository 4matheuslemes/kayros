-- Add study progress fields to contacts
alter table public.contacts
  add column study_book_id text,
  add column study_current_unit_id text,
  add column study_frequency integer,
  add column study_days integer[];
