-- ═══════════════════════════════════════════════════════════
-- Kairós — Adicionar dias programados
-- Run this in the Supabase SQL Editor (Project → SQL Editor → New query)
-- ═══════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists working_days integer[] not null default '{1,2,3,4,5,6,7}';
