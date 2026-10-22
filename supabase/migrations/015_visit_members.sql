-- 015: Visitas de pastoreio a mais de uma pessoa (famílias)
-- 1) Tabela de ligação: uma visita pode ter várias pessoas visitadas
create table if not exists public.shepherding_visit_members (
  visit_id   uuid not null references public.shepherding_visits(id) on delete cascade,
  member_id  uuid not null references public.congregation_members(id) on delete cascade,
  primary key (visit_id, member_id)
);

create index if not exists shepherding_visit_members_member_idx
  on public.shepherding_visit_members (member_id);

alter table public.shepherding_visit_members enable row level security;

drop policy if exists "shepherding_visit_members: strictly own via visit, elder only"
  on public.shepherding_visit_members;
create policy "shepherding_visit_members: strictly own via visit, elder only"
  on public.shepherding_visit_members for all to authenticated
  using (
    public.is_elder_user()
    and exists (select 1 from public.shepherding_visits v
                where v.id = visit_id and v.user_id = auth.uid())
  )
  with check (
    public.is_elder_user()
    and exists (select 1 from public.shepherding_visits v
                where v.id = visit_id and v.user_id = auth.uid())
    and exists (select 1 from public.congregation_members m
                where m.id = member_id and m.user_id = auth.uid())
  );

-- 2) Pessoas visitadas que não estão na lista de irmãos (texto livre)
alter table public.shepherding_visits
  add column if not exists other_people text[] not null default '{}';

-- 3) Troca os irmãos de uma visita de uma vez só (uma transação; respeita a RLS de quem chama)
create or replace function public.set_visit_members(p_visit_id uuid, p_member_ids uuid[])
returns void
language plpgsql
as $$
begin
  delete from public.shepherding_visit_members
   where visit_id = p_visit_id
     and member_id <> all (coalesce(p_member_ids, '{}'::uuid[]));

  insert into public.shepherding_visit_members (visit_id, member_id)
  select p_visit_id, unnest(coalesce(p_member_ids, '{}'::uuid[]))
  on conflict do nothing;
end;
$$;

-- 4) Migra os vínculos antigos (uma pessoa por visita) para a tabela de ligação.
insert into public.shepherding_visit_members (visit_id, member_id)
select id, member_id
from public.shepherding_visits
where member_id is not null
on conflict do nothing;