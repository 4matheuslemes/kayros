-- 014: Irmãos da congregação (PRIVADO: só dono + is_elder) e vínculo com o Registro de Pastoreio
-- Rode no SQL Editor do Supabase do Kairós. Este arquivo NÃO contém nomes de pessoas e pode ir para o Git
-- (salvar como supabase/migrations/014_congregation_members.sql).

-- 1) Função auxiliar para RLS (security definer evita recursão em profiles)
create or replace function public.is_elder_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_elder from public.profiles where id = auth.uid()), false);
$$;

-- 2) Tabela de irmãos
create table if not exists public.congregation_members (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  full_name       text not null,
  appointment     text check (appointment in ('anciao', 'servo_ministerial')),
  service_status  text not null check (service_status in (
                    'publicador_batizado',
                    'publicador_nao_batizado',
                    'pioneiro_regular',
                    'pioneiro_auxiliar_continuo')),
  is_self         boolean not null default false,   -- a linha que sou eu (não aparece como acompanhante nem como visitado)
  active          boolean not null default true,    -- arquivar em vez de apagar
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, full_name)
);

create index if not exists congregation_members_user_name_idx
  on public.congregation_members (user_id, full_name);

drop trigger if exists set_congregation_members_updated_at on public.congregation_members;
create trigger set_congregation_members_updated_at
  before update on public.congregation_members
  for each row execute function public.set_updated_at();

alter table public.congregation_members enable row level security;

drop policy if exists "congregation_members: strictly own rows, elder only" on public.congregation_members;
create policy "congregation_members: strictly own rows, elder only"
  on public.congregation_members for all to authenticated
  using (auth.uid() = user_id and public.is_elder_user())
  with check (auth.uid() = user_id and public.is_elder_user());

-- 3) Vínculo das visitas de pastoreio com os irmãos (os campos de texto antigos continuam existindo)
alter table public.shepherding_visits
  add column if not exists member_id           uuid references public.congregation_members(id) on delete set null,
  add column if not exists companion_member_id uuid references public.congregation_members(id) on delete set null;

create index if not exists shepherding_visits_member_idx
  on public.shepherding_visits (member_id, visit_date desc);

-- 4) Regra no banco: só ancião ou servo ministerial pode ser acompanhante
create or replace function public.check_companion_is_appointed()
returns trigger
language plpgsql
as $$
begin
  if new.companion_member_id is not null and not exists (
    select 1 from public.congregation_members m
    where m.id = new.companion_member_id
      and m.appointment in ('anciao', 'servo_ministerial')
  ) then
    raise exception 'O acompanhante precisa ser ancião ou servo ministerial';
  end if;
  return new;
end;
$$;

drop trigger if exists check_companion_is_appointed on public.shepherding_visits;
create trigger check_companion_is_appointed
  before insert or update on public.shepherding_visits
  for each row execute function public.check_companion_is_appointed();
