-- 017: Sistema de Permissões da Congregação (estilo Hourglass) + Pastoreio Compartilhado (leitura para autorizados, edição só pelo autor)
-- Rode no SQL Editor do Supabase do Kairós. Pode ir para o Git como supabase/migrations/017_permissions_and_shared_shepherding.sql.

-- 1) Remover a constraint antiga de (user_id, full_name) e tornar a base de irmãos e grupos única da congregação
--    (mantemos user_id apenas como referência de quem cadastrou)
alter table public.congregation_members
  drop constraint if exists congregation_members_user_id_full_name_key;

create unique index if not exists congregation_members_full_name_unique_idx
  on public.congregation_members (full_name);

alter table public.service_groups
  drop constraint if exists service_groups_user_id_name_key;

create unique index if not exists service_groups_name_unique_idx
  on public.service_groups (name);

-- 2) Adicionar vínculo com congregation_members e colunas granulares de permissão em profiles
alter table public.profiles
  add column if not exists member_id          uuid references public.congregation_members(id) on delete set null,
  add column if not exists hours_access       boolean not null default false, -- Relatório de horas, cronômetro, meta, histórico (Pioneiros)
  add column if not exists contacts_access    boolean not null default true,  -- Interessados (Revisitas, Estudos e Agenda) - Todos por padrão
  add column if not exists view_members       boolean not null default false, -- Ver Irmãos e Grupos de Serviço
  add column if not exists manage_members     boolean not null default false, -- Criar/editar Irmãos e Grupos de Serviço
  add column if not exists shepherding_access boolean not null default false; -- Ver/criar Registro de Pastoreio

-- 3) Garantir proteção de TODAS as colunas de permissão contra auto-elevação pelo usuário comum
create or replace function public.protect_privileged_profile_columns()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated', 'anon') then
    -- Se quem está chamando NÃO for admin/ancião, bloqueia alteração de colunas de privilégio
    if not public.is_admin_or_elder() then
      if tg_op = 'INSERT' then
        if new.is_admin or new.is_elder or new.talks_access
           or new.hours_access or new.view_members or new.manage_members or new.shepherding_access
           or new.member_id is not null then
          raise exception 'Colunas de permissão não podem ser definidas pelo próprio usuário';
        end if;
      elsif tg_op = 'UPDATE' then
        if new.is_admin           is distinct from old.is_admin
        or new.is_elder           is distinct from old.is_elder
        or new.talks_access       is distinct from old.talks_access
        or new.hours_access       is distinct from old.hours_access
        or new.contacts_access    is distinct from old.contacts_access
        or new.view_members       is distinct from old.view_members
        or new.manage_members     is distinct from old.manage_members
        or new.shepherding_access is distinct from old.shepherding_access
        or new.member_id          is distinct from old.member_id then
          raise exception 'Colunas de permissão não podem ser alteradas pelo próprio usuário';
        end if;
      end if;
    end if;
  end if;
  return new;
end;
$$;

-- 4) Funções auxiliares de permissão (security definer evita recursão em RLS)
create or replace function public.is_admin_or_elder()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select (is_admin or is_elder) from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.has_view_members_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select (is_admin or is_elder or view_members or manage_members or shepherding_access)
       from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.has_manage_members_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select (is_admin or is_elder or manage_members)
       from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.has_shepherding_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select (is_admin or is_elder or shepherding_access)
       from public.profiles where id = auth.uid()),
    false
  );
$$;

-- 5) Função para aplicar permissões padrão automaticamente quando vincular um profile a um irmão (member_id)
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
  if p_member_id is null then
    update public.profiles
       set member_id = null
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

-- 6) Guardar o nome de quem registrou a visita de pastoreio (para exibir "Realizada por: Fulano" a todos os autorizados)
alter table public.shepherding_visits
  add column if not exists created_by_member_id uuid references public.congregation_members(id) on delete set null,
  add column if not exists created_by_name      text;

-- Preencher retroativamente as visitas já criadas com o nome do autor
update public.shepherding_visits v
   set created_by_name = coalesce(
         (select m.full_name from public.congregation_members m where m.user_id = v.user_id and m.is_self = true limit 1),
         (select p.full_name from public.profiles p where p.id = v.user_id),
         'Ancião'
       ),
       created_by_member_id = (select m.id from public.congregation_members m where m.user_id = v.user_id and m.is_self = true limit 1)
 where v.created_by_name is null;

-- Trigger para preencher automaticamente created_by_name e created_by_member_id ao criar visita
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
  select p.member_id, coalesce(m.full_name, p.full_name)
    into v_member_id, v_name
    from public.profiles p
    left join public.congregation_members m on m.id = p.member_id
   where p.id = new.user_id;

  if new.created_by_member_id is null then
    new.created_by_member_id := v_member_id;
  end if;
  if new.created_by_name is null or new.created_by_name = '' then
    new.created_by_name := coalesce(nullif(v_name, ''), 'Ancião');
  end if;
  return new;
end;
$$;

drop trigger if exists set_shepherding_visit_author_trigger on public.shepherding_visits;
create trigger set_shepherding_visit_author_trigger
  before insert on public.shepherding_visits
  for each row execute function public.set_shepherding_visit_author();

-- 7) Atualizar RLS de congregation_members, service_groups, shepherding_visits e shepherding_visit_members
--    para compartilhamento congregacional com trava de edição por autor nas visitas

-- 7.1) congregation_members: quem tem view_members/pastoreio lê; quem tem manage_members cria/edita/exclui
drop policy if exists "congregation_members: strictly own rows, elder only" on public.congregation_members;
drop policy if exists "congregation_members: select for authorized" on public.congregation_members;
drop policy if exists "congregation_members: write for managers" on public.congregation_members;

create policy "congregation_members: select for authorized"
  on public.congregation_members for select to authenticated
  using (public.has_view_members_access());

create policy "congregation_members: write for managers"
  on public.congregation_members for all to authenticated
  using (public.has_manage_members_access())
  with check (public.has_manage_members_access());

-- 7.2) service_groups: quem tem view_members lê; quem tem manage_members cria/edita/exclui
drop policy if exists "service_groups: strictly own rows, elder only" on public.service_groups;
drop policy if exists "service_groups: select for authorized" on public.service_groups;
drop policy if exists "service_groups: write for managers" on public.service_groups;

create policy "service_groups: select for authorized"
  on public.service_groups for select to authenticated
  using (public.has_view_members_access());

create policy "service_groups: write for managers"
  on public.service_groups for all to authenticated
  using (public.has_manage_members_access())
  with check (public.has_manage_members_access());

-- 7.3) shepherding_visits:
--      SELECT: todos com has_shepherding_access() veem TODAS as visitas da congregação
--      INSERT: todos com has_shepherding_access() podem registrar visitas (como seu próprio user_id)
--      UPDATE / DELETE: SOMENTE quem criou a visita (auth.uid() = user_id) pode editar ou excluir!
drop policy if exists "shepherding_visits: strictly own rows, no exceptions" on public.shepherding_visits;
drop policy if exists "shepherding_visits: select all for authorized" on public.shepherding_visits;
drop policy if exists "shepherding_visits: insert own for authorized" on public.shepherding_visits;
drop policy if exists "shepherding_visits: update only own author" on public.shepherding_visits;
drop policy if exists "shepherding_visits: delete only own author" on public.shepherding_visits;

create policy "shepherding_visits: select all for authorized"
  on public.shepherding_visits for select to authenticated
  using (public.has_shepherding_access());

create policy "shepherding_visits: insert own for authorized"
  on public.shepherding_visits for insert to authenticated
  with check (public.has_shepherding_access() and auth.uid() = user_id);

create policy "shepherding_visits: update only own author"
  on public.shepherding_visits for update to authenticated
  using (public.has_shepherding_access() and auth.uid() = user_id)
  with check (public.has_shepherding_access() and auth.uid() = user_id);

create policy "shepherding_visits: delete only own author"
  on public.shepherding_visits for delete to authenticated
  using (public.has_shepherding_access() and auth.uid() = user_id);

-- 7.4) shepherding_visit_members:
--      SELECT: todos com has_shepherding_access()
--      INSERT / DELETE: somente o autor da visita (v.user_id = auth.uid())
drop policy if exists "shepherding_visit_members: strictly own via visit, elder only" on public.shepherding_visit_members;
drop policy if exists "shepherding_visit_members: select all for authorized" on public.shepherding_visit_members;
drop policy if exists "shepherding_visit_members: write only visit author" on public.shepherding_visit_members;

create policy "shepherding_visit_members: select all for authorized"
  on public.shepherding_visit_members for select to authenticated
  using (public.has_shepherding_access());

create policy "shepherding_visit_members: write only visit author"
  on public.shepherding_visit_members for all to authenticated
  using (
    public.has_shepherding_access()
    and exists (select 1 from public.shepherding_visits v where v.id = visit_id and v.user_id = auth.uid())
  )
  with check (
    public.has_shepherding_access()
    and exists (select 1 from public.shepherding_visits v where v.id = visit_id and v.user_id = auth.uid())
  );

-- 8) Configurar estado inicial das contas já existentes (vincular o dono da base ao registro is_self)
update public.profiles p
   set member_id          = (select m.id from public.congregation_members m where m.is_self = true limit 1),
       is_admin           = true,
       is_elder           = true,
       hours_access       = true,
       contacts_access    = true,
       talks_access       = true,
       view_members       = true,
       manage_members     = true,
       shepherding_access = true
 where p.id = '4a2191da-8411-478f-a5a4-6c0747f6f89c';

-- Para qualquer outra conta já existente que tinha meta configurada (como pioneiros atuais), manter hours_access = true
update public.profiles
   set hours_access    = true,
       contacts_access = true
 where id <> '4a2191da-8411-478f-a5a4-6c0747f6f89c'
   and onboarding_completed = true;