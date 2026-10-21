-- ═══════════════════════════════════════════════════════════
-- Kairós — Migration 011: Talks Access & Profile Protection
-- ═══════════════════════════════════════════════════════════

-- 1) Flag de acesso ao módulo Discursos
alter table public.profiles
  add column if not exists talks_access boolean not null default false;

-- 2) Função auxiliar para políticas de RLS (security definer evita recursão em profiles)
create or replace function public.has_talks_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select talks_access from public.profiles where id = auth.uid()), false);
$$;

-- 3) Proteção das colunas privilegiadas
create or replace function public.protect_privileged_profile_columns()
returns trigger
language plpgsql
as $$
begin
  -- Requisições vindas do app chegam com os papéis 'authenticated' ou 'anon'.
  -- SQL Editor (postgres), service_role e funções security definer não são afetados.
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      if new.is_admin or new.is_elder or new.talks_access then
        raise exception 'Colunas privilegiadas não podem ser definidas pelo usuário';
      end if;
    elsif tg_op = 'UPDATE' then
      if new.is_admin     is distinct from old.is_admin
      or new.is_elder     is distinct from old.is_elder
      or new.talks_access is distinct from old.talks_access then
        raise exception 'Colunas privilegiadas não podem ser alteradas pelo usuário';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_privileged_profile_columns on public.profiles;
create trigger protect_privileged_profile_columns
  before insert or update on public.profiles
  for each row execute function public.protect_privileged_profile_columns();

-- 4) Liberar o módulo para a minha conta (Matheus Lemes)
update public.profiles
  set talks_access = true
  where id = '4a2191da-8411-478f-a5a4-6c0747f6f89c';
