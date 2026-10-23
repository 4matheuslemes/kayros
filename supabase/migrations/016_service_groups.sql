-- 016: Grupos de Serviço de Campo (PRIVADO: só dono + is_elder)
-- Rode no SQL Editor do Supabase do Kairós. Este arquivo NÃO contém nomes de pessoas e pode ir para o Git
-- (salvar como supabase/migrations/016_service_groups.sql).

-- 1) Tabela de grupos de serviço
create table if not exists public.service_groups (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  name           text not null,
  meeting_info   text not null default 'Consideração do campo às 8:15h',
  sort_order     smallint not null default 0,
  overseer_id    uuid references public.congregation_members(id) on delete set null,
  assistant_id   uuid references public.congregation_members(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists service_groups_user_order_idx
  on public.service_groups (user_id, sort_order, name);

drop trigger if exists set_service_groups_updated_at on public.service_groups;
create trigger set_service_groups_updated_at
  before update on public.service_groups
  for each row execute function public.set_updated_at();

alter table public.service_groups enable row level security;

drop policy if exists "service_groups: strictly own rows, elder only" on public.service_groups;
create policy "service_groups: strictly own rows, elder only"
  on public.service_groups for all to authenticated
  using (auth.uid() = user_id and public.is_elder_user())
  with check (auth.uid() = user_id and public.is_elder_user());

-- 2) Vínculo do irmão com o grupo (um irmão pertence a no máximo um grupo; se o grupo for apagado, fica sem grupo)
alter table public.congregation_members
  add column if not exists group_id uuid references public.service_groups(id) on delete set null;

create index if not exists congregation_members_group_idx
  on public.congregation_members (group_id);

-- 3) Regra de integridade: superintendente e ajudante precisam pertencer ao próprio grupo (quando definidos)
--    e se um irmão for transferido para outro grupo ou removido, limpa automaticamente o cargo no grupo antigo.
create or replace function public.sync_service_group_roles()
returns trigger
language plpgsql
as $$
begin
  if old.group_id is distinct from new.group_id and old.group_id is not null then
    update public.service_groups
       set overseer_id  = case when overseer_id  = new.id then null else overseer_id end,
           assistant_id = case when assistant_id = new.id then null else assistant_id end
     where id = old.group_id;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_service_group_roles_on_member_change on public.congregation_members;
create trigger sync_service_group_roles_on_member_change
  after update of group_id on public.congregation_members
  for each row execute function public.sync_service_group_roles();