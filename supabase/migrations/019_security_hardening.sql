-- ═══════════════════════════════════════════════════════════════════════
-- Kairós — Migration 019: Security Hardening & Isolation (Corrigida)
-- ═══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- 1) C1: apply_member_default_permissions — Revoke e Guarda Interna
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.apply_member_default_permissions(p_user_id uuid, p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appointment text;
  v_status      text;
  v_is_elder    boolean;
  v_is_sm       boolean;
  v_is_pr       boolean;
begin
  -- Guarda contra execução indevida via RPC por cliente
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
     and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'Acesso negado: operação administrativa restrita ao servidor';
  end if;

  if p_member_id is null then
    update public.profiles
       set member_id          = null,
           is_elder           = false,
           hours_access       = false,
           talks_access       = false,
           view_members       = false,
           manage_members     = false,
           shepherding_access = false
     where id = p_user_id;
    return;
  end if;

  select appointment, service_status
    into v_appointment, v_status
    from public.congregation_members
   where id = p_member_id;

  v_is_elder := (v_appointment = 'anciao');
  v_is_sm    := (v_appointment = 'servo_ministerial');
  v_is_pr    := (v_status = 'pioneiro_regular');

  update public.profiles
     set member_id          = p_member_id,
         is_elder           = v_is_elder,
         is_admin           = (is_admin or v_is_elder),
         hours_access       = v_is_pr,
         contacts_access    = true,
         talks_access       = (v_is_elder or v_is_sm),
         view_members       = v_is_elder,
         manage_members     = v_is_elder,
         shepherding_access = v_is_elder
   where id = p_user_id;
end;
$$;

revoke all on function public.apply_member_default_permissions(uuid, uuid) from public, anon, authenticated;
grant execute on function public.apply_member_default_permissions(uuid, uuid) to service_role;

-- ─────────────────────────────────────────────────────────────────────
-- 2) M1, M8 e B5: Blindagem do Perfil e Políticas Estritas
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.protect_privileged_profile_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      if new.is_admin or new.is_elder or new.talks_access
         or new.hours_access or new.view_members or new.manage_members
         or new.shepherding_access or new.member_id is not null
         or new.onboarding_completed then
        raise exception 'Colunas privilegiadas não podem ser definidas pelo cliente';
      end if;
    elsif tg_op = 'UPDATE' then
      if new.is_admin              is distinct from old.is_admin
      or new.is_elder              is distinct from old.is_elder
      or new.talks_access          is distinct from old.talks_access
      or new.hours_access          is distinct from old.hours_access
      or new.contacts_access      is distinct from old.contacts_access
      or new.view_members          is distinct from old.view_members
      or new.manage_members        is distinct from old.manage_members
      or new.shepherding_access    is distinct from old.shepherding_access
      or new.member_id             is distinct from old.member_id
      or new.onboarding_completed  is distinct from old.onboarding_completed then
        raise exception 'Colunas privilegiadas não podem ser alteradas pelo cliente';
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

-- B5: Trocar policy FOR ALL por SELECT, INSERT e UPDATE separadas (sem DELETE para o cliente)
drop policy if exists "profiles: own row" on public.profiles;
drop policy if exists "profiles: select own row" on public.profiles;
drop policy if exists "profiles: insert own row" on public.profiles;
drop policy if exists "profiles: update own row" on public.profiles;

create policy "profiles: select own row"
  on public.profiles for select to authenticated
  using (auth.uid() = id);

create policy "profiles: insert own row"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);

create policy "profiles: update own row"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ─────────────────────────────────────────────────────────────────────
-- 3) A1 e B4: Negação por Padrão — public.is_linked_member()
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.is_linked_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select (member_id is not null or is_admin = true) from public.profiles where id = auth.uid()),
    false
  );
$$;

-- Atualizar policies de daily_records, contacts e visit_history
drop policy if exists "daily_records: own rows" on public.daily_records;
drop policy if exists "daily_records: own rows for linked member" on public.daily_records;
create policy "daily_records: own rows for linked member"
  on public.daily_records for all to authenticated
  using (auth.uid() = user_id and public.is_linked_member())
  with check (auth.uid() = user_id and public.is_linked_member());

drop policy if exists "contacts: own rows" on public.contacts;
drop policy if exists "contacts: own rows for linked member" on public.contacts;
create policy "contacts: own rows for linked member"
  on public.contacts for all to authenticated
  using (auth.uid() = user_id and public.is_linked_member())
  with check (auth.uid() = user_id and public.is_linked_member());

drop policy if exists "visit_history: own rows via contact" on public.visit_history;
drop policy if exists "visit_history: own rows via contact for linked member" on public.visit_history;
create policy "visit_history: own rows via contact for linked member"
  on public.visit_history for all to authenticated
  using (
    public.is_linked_member() and exists (
      select 1 from public.contacts c
       where c.id = contact_id
         and c.user_id = auth.uid()
    )
  )
  with check (
    public.is_linked_member() and exists (
      select 1 from public.contacts c
       where c.id = contact_id
         and c.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────
-- 4) A2 e M2: Pastoreio — Autoria Imutável e Sigilo do Relatório
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.set_shepherding_visit_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id uuid;
  v_name      text;
begin
  if tg_op = 'INSERT' then
    new.user_id := auth.uid();

    select p.member_id, coalesce(m.full_name, p.full_name)
      into v_member_id, v_name
      from public.profiles p
      left join public.congregation_members m on m.id = p.member_id
     where p.id = new.user_id;

    new.created_by_member_id := v_member_id;
    new.created_by_name      := coalesce(nullif(v_name, ''), 'Ancião');
    return new;
  elsif tg_op = 'UPDATE' then
    new.user_id              := old.user_id;
    new.created_by_member_id := old.created_by_member_id;
    new.created_by_name      := old.created_by_name;
    return new;
  end if;
  return new;
end;
$$;

drop trigger if exists set_shepherding_visit_author_trigger on public.shepherding_visits;
create trigger set_shepherding_visit_author_trigger
  before insert or update on public.shepherding_visits
  for each row execute function public.set_shepherding_visit_author();

-- Tabela isolada para texto dos relatórios de pastoreio
create table if not exists public.shepherding_reports (
  visit_id    uuid primary key references public.shepherding_visits(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  report      text not null default '',
  updated_at  timestamptz not null default now()
);

alter table public.shepherding_reports enable row level security;

drop policy if exists "shepherding_reports: author only" on public.shepherding_reports;
create policy "shepherding_reports: author only"
  on public.shepherding_reports for all to authenticated
  using (auth.uid() = user_id and public.has_shepherding_access())
  with check (auth.uid() = user_id and public.has_shepherding_access());

-- Migrar relatórios existentes e remover coluna de shepherding_visits
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name = 'shepherding_visits'
       and column_name = 'report'
  ) then
    insert into public.shepherding_reports (visit_id, user_id, report)
    select id, user_id, report
      from public.shepherding_visits
     where report is not null and btrim(report) <> ''
    on conflict (visit_id) do nothing;

    alter table public.shepherding_visits drop column if exists report;
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────
-- 5) M9: Sincronização ao excluir membro ou alterar designação
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.sync_member_privileges_on_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_elder boolean;
  v_is_sm    boolean;
  v_is_pr    boolean;
begin
  if tg_op = 'DELETE' then
    update public.profiles
       set member_id          = null,
           is_elder           = false,
           talks_access       = false,
           view_members       = false,
           manage_members     = false,
           shepherding_access = false,
           hours_access       = false
     where member_id = old.id;
    return old;
  elsif tg_op = 'UPDATE' then
    if old.appointment is distinct from new.appointment
       or old.service_status is distinct from new.service_status then
      v_is_elder := (new.appointment = 'anciao');
      v_is_sm    := (new.appointment = 'servo_ministerial');
      v_is_pr    := (new.service_status = 'pioneiro_regular');

      update public.profiles
         set is_elder           = v_is_elder,
             hours_access       = v_is_pr,
             talks_access       = (v_is_elder or v_is_sm),
             view_members       = v_is_elder,
             manage_members     = v_is_elder,
             shepherding_access = v_is_elder
       where member_id = new.id;
    end if;
    return new;
  end if;
  return null;
end;
$$;

-- Separado em dois triggers (PostgreSQL não permite misturar AFTER e BEFORE no mesmo trigger)
drop trigger if exists sync_member_privileges_on_change_trigger on public.congregation_members;
drop trigger if exists sync_member_privileges_on_update_trigger on public.congregation_members;
drop trigger if exists sync_member_privileges_on_delete_trigger on public.congregation_members;

create trigger sync_member_privileges_on_update_trigger
  after update of appointment, service_status on public.congregation_members
  for each row execute function public.sync_member_privileges_on_change();

create trigger sync_member_privileges_on_delete_trigger
  before delete on public.congregation_members
  for each row execute function public.sync_member_privileges_on_change();

-- ─────────────────────────────────────────────────────────────────────
-- 6) B1 e B3: Limpeza de Policies e Definição de search_path
-- ─────────────────────────────────────────────────────────────────────
drop policy if exists "member_invites: select for admin or elder" on public.member_invites;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;

create or replace function public.check_companion_is_appointed()
returns trigger
language plpgsql
set search_path = public
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

create or replace function public.sync_service_group_roles()
returns trigger
language plpgsql
set search_path = public
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

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_visit_members(p_visit_id uuid, p_member_ids uuid[])
returns void
language plpgsql
set search_path = public
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