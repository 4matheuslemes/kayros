-- 018: Convites estilo Hourglass vinculados diretamente a congregation_members (com Token SHA-256, QR Code, Google OAuth e E-mail/Senha)
-- Rode no SQL Editor do Supabase do Kairós. Pode ir para o Git como supabase/migrations/018_hourglass_invites.sql.

-- 1) Garantir vínculo único entre congregation_members e profiles
create unique index if not exists profiles_member_id_unique_idx
  on public.profiles (member_id)
  where member_id is not null;

-- 2) Tabela de convites por irmão (estilo Hourglass)
create table if not exists public.member_invites (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references public.congregation_members(id) on delete cascade,
  token_hash  text not null unique,
  expires_at  timestamptz not null default (now() + interval '7 days'),
  used_at     timestamptz,
  used_by     uuid references auth.users(id) on delete set null,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists member_invites_member_idx
  on public.member_invites (member_id, created_at desc);

alter table public.member_invites enable row level security;

-- Somente anciãos/admins podem listar convites no painel; o aceite é feito no servidor via service_role
drop policy if exists "member_invites: select for admin or elder" on public.member_invites;
create policy "member_invites: select for admin or elder"
  on public.member_invites for select to authenticated
  using (public.is_admin_or_elder());