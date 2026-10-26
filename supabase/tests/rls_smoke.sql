-- ═══════════════════════════════════════════════════════════════════════
-- Kairós — rls_smoke.sql
-- Testes NEGATIVOS reutilizáveis de RLS / permissões, por persona.
--
-- COMO RODAR (nunca em produção com dados reais; use local ou staging):
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_smoke.sql
--
-- COMO FUNCIONA
--   * Tudo roda dentro de UMA transação que termina em ROLLBACK:
--     nada permanece no banco (schema auxiliar, usuários e dados de teste somem).
--   * Os UUIDs e nomes abaixo são SINTÉTICOS (placeholders). Não há dado real.
--   * Cada persona é simulada com:
--       set local role authenticated|anon + request.jwt.claims (sub = UUID fictício)
--   * Cada teste usa um subtransaction que é desfeito, então um teste que
--     "passa a ser permitido" por engano não contamina o seguinte.
--   * Resultado: tabela PASS/FAIL no final; se houver FAIL, o script lança
--     exceção (exit code != 0 no psql com ON_ERROR_STOP).
--
-- UUIDs sintéticos usados (prefixo 00000000-0000-4000-8000-0000000000XX):
--   usuários : a1 sem vínculo | a2 publicador | a3 servo ministerial
--              a4 ancião      | a5 administrador | a6 "outro" (vítima)
--   irmãos   : b1 ancião (vinculado a a4) | b2 servo (a3) | b3 publicador (a2)
--              b4 ancião SEM conta vinculada (alvo de escalada)
--   visitas  : c1 (autor a4) | c2 (autor a5)       outline: d1 (autor a3)
--
-- NÃO CHECÁVEL POR SQL (conferir no painel do Supabase):
--   Authentication → Sign In / Providers → "Allow new users to sign up"
--   deve estar DESLIGADO (e "Confirm email" LIGADO). Também revisar a
--   lista de Redirect URLs e o Rate limit de Auth.
-- ═══════════════════════════════════════════════════════════════════════

begin;

-- ─── 0. Infra de teste ──────────────────────────────────────────────────
create schema rls_smoke;

create table rls_smoke.results (
  id        bigint generated always as identity primary key,
  persona   text    not null,
  test      text    not null,
  expected  text    not null,
  pass      boolean not null,
  detail    text
);

create function rls_smoke.record(
  p_persona text, p_test text, p_expected text, p_pass boolean, p_detail text default null
) returns void
language sql security definer set search_path = pg_catalog, rls_smoke
as $$
  insert into rls_smoke.results (persona, test, expected, pass, detail)
  values (p_persona, p_test, p_expected, p_pass, p_detail);
$$;

-- Fotografia do perfil (ignora colunas voláteis). SECURITY DEFINER só para o teste.
create function rls_smoke.peek_profile(p_id uuid) returns jsonb
language sql security definer set search_path = pg_catalog, public
as $$
  select to_jsonb(p) - 'updated_at' - 'full_name'
    from public.profiles p where p.id = p_id;
$$;

-- Passa se a SQL der erro OU afetar/retornar 0 linhas.
create function rls_smoke.expect_blocked(p_persona text, p_test text, p_sql text)
returns void language plpgsql as $f$
declare n bigint := -1; v_err text;
begin
  begin
    execute p_sql;
    get diagnostics n = row_count;
    raise exception using message = '__rolled_back__';
  exception when others then
    v_err := sqlerrm;
  end;
  if v_err = '__rolled_back__' then
    perform rls_smoke.record(p_persona, p_test, 'bloqueado', n = 0,
                             format('linhas afetadas/retornadas: %s', n));
  else
    perform rls_smoke.record(p_persona, p_test, 'bloqueado', true, 'erro: ' || left(v_err, 100));
  end if;
end $f$;

-- Controle positivo: passa se NÃO der erro e afetar/retornar >= 1 linha.
create function rls_smoke.expect_allowed(p_persona text, p_test text, p_sql text)
returns void language plpgsql as $f$
declare n bigint := -1; v_err text;
begin
  begin
    execute p_sql;
    get diagnostics n = row_count;
    raise exception using message = '__rolled_back__';
  exception when others then
    v_err := sqlerrm;
  end;
  if v_err = '__rolled_back__' then
    perform rls_smoke.record(p_persona, p_test, 'permitido', n > 0,
                             format('linhas afetadas/retornadas: %s', n));
  else
    perform rls_smoke.record(p_persona, p_test, 'permitido', false, 'erro: ' || left(v_err, 100));
  end if;
end $f$;

-- Passa se o perfil alvo ficar IDÊNTICO depois da SQL (ou se a SQL der erro).
create function rls_smoke.expect_profile_unchanged(
  p_persona text, p_test text, p_sql text, p_target uuid
) returns void language plpgsql as $f$
declare v_before jsonb; v_after jsonb; v_err text;
begin
  v_before := rls_smoke.peek_profile(p_target);
  begin
    execute p_sql;
    v_after := rls_smoke.peek_profile(p_target);
    raise exception using message = '__rolled_back__';
  exception when others then
    v_err := sqlerrm;
  end;
  if v_err = '__rolled_back__' then
    perform rls_smoke.record(p_persona, p_test, 'perfil inalterado',
                             v_after is not distinct from v_before,
                             case when v_after is not distinct from v_before
                                  then 'sem mudança' else 'PERFIL FOI ALTERADO' end);
  else
    perform rls_smoke.record(p_persona, p_test, 'perfil inalterado', true, 'erro: ' || left(v_err, 100));
  end if;
end $f$;

-- Executa p_setup e depois p_check (boolean). Erro no setup conta como bloqueio (passa).
create function rls_smoke.expect_check(p_persona text, p_test text, p_setup text, p_check text)
returns void language plpgsql as $f$
declare v boolean; v_err text;
begin
  begin
    execute p_setup;
    execute p_check into v;
    raise exception using message = '__rolled_back__';
  exception when others then
    v_err := sqlerrm;
  end;
  if v_err = '__rolled_back__' then
    perform rls_smoke.record(p_persona, p_test, 'verdadeiro', coalesce(v, false), null);
  else
    perform rls_smoke.record(p_persona, p_test, 'verdadeiro', true, 'bloqueado: ' || left(v_err, 100));
  end if;
end $f$;

-- Negações comuns a quem NÃO é ancião/administrador (sem vínculo, publicador, servo).
create function rls_smoke.run_common_denials(p text, p_victim uuid)
returns void language plpgsql as $f$
declare c text;
begin
  -- Leitura: nada de dados da congregação nem de terceiros
  perform rls_smoke.expect_blocked(p, 'não lê congregation_members',        $q$select 1 from public.congregation_members$q$);
  perform rls_smoke.expect_blocked(p, 'não lê service_groups',              $q$select 1 from public.service_groups$q$);
  perform rls_smoke.expect_blocked(p, 'não lê shepherding_visits',          $q$select 1 from public.shepherding_visits$q$);
  perform rls_smoke.expect_blocked(p, 'não lê texto do relatório (report)', $q$select report from public.shepherding_reports$q$);
  perform rls_smoke.expect_blocked(p, 'não lê shepherding_visit_members',   $q$select 1 from public.shepherding_visit_members$q$);
  perform rls_smoke.expect_blocked(p, 'não lê member_invites',              $q$select 1 from public.member_invites$q$);
  perform rls_smoke.expect_blocked(p, 'não lê token_hash',                  $q$select token_hash from public.member_invites$q$);
  perform rls_smoke.expect_blocked(p, 'não lê perfis de terceiros',         $q$select 1 from public.profiles where id <> auth.uid()$q$);
  perform rls_smoke.expect_blocked(p, 'não lê daily_records de terceiros',  format($q$select 1 from public.daily_records where user_id = %L$q$, p_victim));
  perform rls_smoke.expect_blocked(p, 'não lê contacts de terceiros',       format($q$select 1 from public.contacts where user_id = %L$q$, p_victim));

  -- Escrita: nada de dados da congregação nem de terceiros
  perform rls_smoke.expect_blocked(p, 'não altera perfil de terceiros',     format($q$update public.profiles set full_name = 'x' where id = %L$q$, p_victim));
  perform rls_smoke.expect_blocked(p, 'não cria congregation_members',      $q$insert into public.congregation_members (user_id, full_name, service_status) values (auth.uid(), 'SMOKE intruso', 'publicador_batizado')$q$);
  perform rls_smoke.expect_blocked(p, 'não cria service_groups',            $q$insert into public.service_groups (user_id, name) values (auth.uid(), 'SMOKE grupo')$q$);
  perform rls_smoke.expect_blocked(p, 'não cria shepherding_visits',        $q$insert into public.shepherding_visits (user_id, family_or_person, visit_date) values (auth.uid(), 'SMOKE', current_date)$q$);
  perform rls_smoke.expect_blocked(p, 'não cria member_invites',            $q$insert into public.member_invites (member_id, token_hash) values ('00000000-0000-4000-8000-0000000000b4', 'smoke-forjado')$q$);
  perform rls_smoke.expect_blocked(p, 'não altera member_invites',          $q$update public.member_invites set expires_at = now() + interval '365 days'$q$);
  perform rls_smoke.expect_blocked(p, 'não apaga member_invites',           $q$delete from public.member_invites$q$);

  -- Auto-elevação pelo cliente (colunas privilegiadas, uma a uma)
  foreach c in array array['is_admin','is_elder','talks_access','hours_access','contacts_access',
                           'view_members','manage_members','shepherding_access'] loop
    perform rls_smoke.expect_blocked(p, 'não altera o próprio ' || c,
      format('update public.profiles set %I = not %I where id = auth.uid()', c, c));
  end loop;
  perform rls_smoke.expect_blocked(p, 'não altera o próprio member_id (vínculo)',
    $q$update public.profiles set member_id = '00000000-0000-4000-8000-0000000000b4' where id = auth.uid()$q$);

  -- RPC SECURITY DEFINER: não pode alterar permissões de ninguém
  perform rls_smoke.expect_profile_unchanged(p, 'RPC apply_member_default_permissions no próprio perfil (→ ancião livre)',
    $q$select public.apply_member_default_permissions(auth.uid(), '00000000-0000-4000-8000-0000000000b4')$q$, auth.uid());
  perform rls_smoke.expect_profile_unchanged(p, 'RPC apply_member_default_permissions em perfil de terceiro',
    format($q$select public.apply_member_default_permissions(%L, '00000000-0000-4000-8000-0000000000b4')$q$, p_victim), p_victim);
  perform rls_smoke.expect_profile_unchanged(p, 'RPC apply_member_default_permissions(null) desvincula terceiro',
    format($q$select public.apply_member_default_permissions(%L, null)$q$, p_victim), p_victim);
end $f$;

grant usage on schema rls_smoke to anon, authenticated;
grant execute on all functions in schema rls_smoke to anon, authenticated;

-- ─── 1. Fixtures (como postgres; gatilhos de proteção não se aplicam) ───
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000a1', 'a1-sem-vinculo@example.invalid'),
  ('00000000-0000-4000-8000-0000000000a2', 'a2-publicador@example.invalid'),
  ('00000000-0000-4000-8000-0000000000a3', 'a3-servo@example.invalid'),
  ('00000000-0000-4000-8000-0000000000a4', 'a4-anciao@example.invalid'),
  ('00000000-0000-4000-8000-0000000000a5', 'a5-admin@example.invalid'),
  ('00000000-0000-4000-8000-0000000000a6', 'a6-outro@example.invalid');
-- (o trigger handle_new_user cria as linhas em public.profiles)

insert into public.congregation_members (id, user_id, full_name, appointment, service_status) values
  ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000a5', 'SMOKE Irmao B1', 'anciao',            'publicador_batizado'),
  ('00000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000a5', 'SMOKE Irmao B2', 'servo_ministerial', 'publicador_batizado'),
  ('00000000-0000-4000-8000-0000000000b3', '00000000-0000-4000-8000-0000000000a5', 'SMOKE Irmao B3', null,                'publicador_batizado'),
  ('00000000-0000-4000-8000-0000000000b4', '00000000-0000-4000-8000-0000000000a5', 'SMOKE Irmao B4', 'anciao',            'publicador_batizado');

update public.profiles set member_id = '00000000-0000-4000-8000-0000000000b3'
 where id = '00000000-0000-4000-8000-0000000000a2';
update public.profiles set member_id = '00000000-0000-4000-8000-0000000000b2', talks_access = true
 where id = '00000000-0000-4000-8000-0000000000a3';
update public.profiles set member_id = '00000000-0000-4000-8000-0000000000b1',
       is_elder = true, talks_access = true, view_members = true, manage_members = true, shepherding_access = true
 where id = '00000000-0000-4000-8000-0000000000a4';
update public.profiles set is_admin = true
 where id = '00000000-0000-4000-8000-0000000000a5';

insert into public.daily_records (user_id, date, duration_minutes)
  values ('00000000-0000-4000-8000-0000000000a6', current_date, 30);
insert into public.contacts (user_id, name)
  values ('00000000-0000-4000-8000-0000000000a6', 'SMOKE contato');

insert into public.shepherding_visits (id, user_id, family_or_person, visit_date) values
  ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a4', 'SMOKE visita 1', current_date),
  ('00000000-0000-4000-8000-0000000000c2', '00000000-0000-4000-8000-0000000000a5', 'SMOKE visita 2', current_date);

insert into public.shepherding_reports (visit_id, user_id, report) values
  ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a4', 'SMOKE-RELATORIO-SIGILOSO-1'),
  ('00000000-0000-4000-8000-0000000000c2', '00000000-0000-4000-8000-0000000000a5', 'SMOKE-RELATORIO-SIGILOSO-2');

insert into public.shepherding_visit_members (visit_id, member_id) values
  ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000b3');

insert into public.member_invites (member_id, token_hash)
  values ('00000000-0000-4000-8000-0000000000b4', 'smoke-hash-nao-e-um-token-real');
insert into public.outlines (id, user_id, title)
  values ('00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-0000000000a3', 'SMOKE esboço');
insert into public.bible_verses (book_number, book_name, chapter, verse, text)
  values (0, 'SMOKE', 1, 1, 'smoke versiculo');

-- ─── 2. Checagens de catálogo (estado real do banco) ────────────────────
do $do$
declare v text;
begin
  -- 2.1 RLS ligada em TODA tabela de public
  select string_agg(c.relname, ', ') into v
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r','p') and not c.relrowsecurity;
  perform rls_smoke.record('catálogo', 'RLS ligada em todas as tabelas de public', 'nenhuma sem RLS', v is null, v);

  -- 2.2 Nenhuma policy "using (true)" / "with check (true)"
  select string_agg(tablename || ': ' || policyname, '; ') into v
    from pg_policies
   where schemaname = 'public' and (qual = 'true' or with_check = 'true');
  perform rls_smoke.record('catálogo', 'nenhuma policy com using/with check (true)', 'nenhuma', v is null, v);

  -- 2.3 Defesa em profundidade: nenhuma policy aplicada a PUBLIC/anon
  select string_agg(tablename || ': ' || policyname, '; ') into v
    from pg_policies
   where schemaname = 'public' and (roles && array['public','anon']::name[]);
  perform rls_smoke.record('catálogo', 'policies restritas a authenticated (nenhuma em PUBLIC/anon)', 'nenhuma', v is null, v);

  -- 2.4 SECURITY DEFINER sempre com search_path fixo
  select string_agg(p.proname, ', ') into v
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prosecdef
     and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) cfg where cfg like 'search_path=%');
  perform rls_smoke.record('catálogo', 'toda função SECURITY DEFINER tem search_path fixo', 'nenhuma sem', v is null, v);

  -- 2.5 SECURITY DEFINER chamável via /rpc/ só as helpers de RLS (allow-list)
  select string_agg(p.oid::regprocedure::text, ', ') into v
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prosecdef and p.prorettype <> 'trigger'::regtype
     and p.proname <> all (array['has_talks_access','is_elder_user','is_admin_or_elder',
                                 'has_view_members_access','has_manage_members_access','has_shepherding_access',
                                 'is_linked_member'])
     and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'));
  perform rls_smoke.record('catálogo', 'SECURITY DEFINER executável por anon/authenticated só na allow-list', 'nenhuma fora da lista', v is null, v);

  -- 2.6 Trigger de proteção de colunas existe em profiles
  perform rls_smoke.record('catálogo', 'trigger protect_privileged_profile_columns presente em profiles', 'existe',
    exists (select 1 from pg_trigger where tgrelid = 'public.profiles'::regclass
               and tgname = 'protect_privileged_profile_columns' and not tgisinternal), null);

  -- 2.7 member_invites: nenhuma policy de escrita para clientes
  select string_agg(policyname || ' (' || cmd || ')', '; ') into v
    from pg_policies where schemaname = 'public' and tablename = 'member_invites' and cmd <> 'SELECT';
  perform rls_smoke.record('catálogo', 'member_invites sem policy de escrita', 'nenhuma', v is null, v);

  -- 2.8 Realtime: nenhuma tabela publicada
  select string_agg(schemaname || '.' || tablename, ', ') into v
    from pg_publication_tables where pubname = 'supabase_realtime';
  perform rls_smoke.record('catálogo', 'nenhuma tabela publicada no Realtime', 'nenhuma', v is null, v);

  -- 2.9 Storage: nenhum bucket (ou todos privados)
  begin
    execute 'select string_agg(id || case when public then '' (PÚBLICO)'' else '''' end, '', '') from storage.buckets' into v;
  exception when others then v := null; end;
  perform rls_smoke.record('catálogo', 'nenhum bucket de Storage', 'nenhum', v is null, v);
end $do$;

-- ─── 3. Persona: ANON (sem sessão) ──────────────────────────────────────
reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select set_config('request.jwt.claim.sub', '', true);
set local role anon;

do $do$
begin
  perform rls_smoke.expect_blocked('anon', 'não lê profiles',              $q$select 1 from public.profiles$q$);
  perform rls_smoke.expect_blocked('anon', 'não lê congregation_members',  $q$select 1 from public.congregation_members$q$);
  perform rls_smoke.expect_blocked('anon', 'não lê shepherding_visits',    $q$select 1 from public.shepherding_visits$q$);
  perform rls_smoke.expect_blocked('anon', 'não lê member_invites',        $q$select 1 from public.member_invites$q$);
  perform rls_smoke.expect_blocked('anon', 'não lê daily_records',         $q$select 1 from public.daily_records$q$);
  perform rls_smoke.expect_blocked('anon', 'não lê contacts',              $q$select 1 from public.contacts$q$);
  perform rls_smoke.expect_blocked('anon', 'não lê bible_verses',          $q$select 1 from public.bible_verses$q$);
  perform rls_smoke.expect_blocked('anon', 'não cria shepherding_visits',  $q$insert into public.shepherding_visits (user_id, family_or_person, visit_date) values ('00000000-0000-4000-8000-0000000000a1', 'SMOKE', current_date)$q$);
  perform rls_smoke.expect_profile_unchanged('anon', 'RPC apply_member_default_permissions em perfil de terceiro',
    $q$select public.apply_member_default_permissions('00000000-0000-4000-8000-0000000000a4', '00000000-0000-4000-8000-0000000000b4')$q$,
    '00000000-0000-4000-8000-0000000000a4');
end $do$;

-- ─── 4. Persona: CONTA SEM VÍNCULO (a1) — negação por padrão ────────────
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000a1', true);
set local role authenticated;

do $do$
begin
  perform rls_smoke.run_common_denials('sem vínculo', '00000000-0000-4000-8000-0000000000a4');
  perform rls_smoke.expect_blocked('sem vínculo', 'não lê bible_verses',   $q$select 1 from public.bible_verses$q$);
  perform rls_smoke.expect_blocked('sem vínculo', 'não cria outlines',     $q$insert into public.outlines (user_id, title) values (auth.uid(), 'SMOKE')$q$);
  -- negação por padrão: conta sem vínculo não deve gravar nem dados "próprios"
  perform rls_smoke.expect_blocked('sem vínculo', 'não grava daily_records', $q$insert into public.daily_records (user_id, date, duration_minutes) values (auth.uid(), current_date, 10)$q$);
  perform rls_smoke.expect_blocked('sem vínculo', 'não grava contacts',      $q$insert into public.contacts (user_id, name) values (auth.uid(), 'SMOKE')$q$);
end $do$;

-- ─── 5. Persona: PUBLICADOR (a2) ────────────────────────────────────────
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000a2', true);
set local role authenticated;

do $do$
begin
  perform rls_smoke.run_common_denials('publicador', '00000000-0000-4000-8000-0000000000a4');
  perform rls_smoke.expect_blocked('publicador', 'não lê bible_verses', $q$select 1 from public.bible_verses$q$);
  perform rls_smoke.expect_blocked('publicador', 'não cria outlines',   $q$insert into public.outlines (user_id, title) values (auth.uid(), 'SMOKE')$q$);
  -- controles positivos (evitam falso-verde por "tudo bloqueado")
  perform rls_smoke.expect_allowed('publicador', 'lê o próprio perfil',   $q$select 1 from public.profiles where id = auth.uid()$q$);
  perform rls_smoke.expect_allowed('publicador', 'grava o próprio contato', $q$insert into public.contacts (user_id, name) values (auth.uid(), 'SMOKE')$q$);
end $do$;

-- ─── 6. Persona: SERVO MINISTERIAL (a3) — talks_access, sem pastoreio ───
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a3","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000a3', true);
set local role authenticated;

do $do$
begin
  perform rls_smoke.run_common_denials('servo ministerial', '00000000-0000-4000-8000-0000000000a4');
  perform rls_smoke.expect_allowed('servo ministerial', 'lê bible_verses (talks_access)', $q$select 1 from public.bible_verses$q$);
  perform rls_smoke.expect_allowed('servo ministerial', 'cria o próprio outline',          $q$insert into public.outlines (user_id, title) values (auth.uid(), 'SMOKE')$q$);
  perform rls_smoke.expect_blocked('servo ministerial', 'não cria outline em nome de outro', $q$insert into public.outlines (user_id, title) values ('00000000-0000-4000-8000-0000000000a6', 'SMOKE')$q$);
end $do$;

-- ─── 7. Persona: ANCIÃO (a4) ────────────────────────────────────────────
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a4","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000a4', true);
set local role authenticated;

do $do$
begin
  -- controles positivos
  perform rls_smoke.expect_allowed('ancião', 'lê congregation_members',  $q$select 1 from public.congregation_members$q$);
  perform rls_smoke.expect_allowed('ancião', 'lê shepherding_visits',    $q$select 1 from public.shepherding_visits$q$);
  perform rls_smoke.expect_allowed('ancião', 'cria irmão (manage_members)', $q$insert into public.congregation_members (user_id, full_name, service_status) values (auth.uid(), 'SMOKE novo irmao', 'publicador_batizado')$q$);
  perform rls_smoke.expect_allowed('ancião', 'cria a própria visita',    $q$insert into public.shepherding_visits (user_id, family_or_person, visit_date) values (auth.uid(), 'SMOKE', current_date)$q$);

  -- "só o criador edita/exclui" garantido por policy (visita c2 é de outro autor)
  perform rls_smoke.expect_blocked('ancião', 'não edita visita de outro autor',   $q$update public.shepherding_visits set family_or_person = 'x' where id = '00000000-0000-4000-8000-0000000000c2'$q$);
  perform rls_smoke.expect_blocked('ancião', 'não exclui visita de outro autor',  $q$delete from public.shepherding_visits where id = '00000000-0000-4000-8000-0000000000c2'$q$);
  perform rls_smoke.expect_blocked('ancião', 'não cria visita em nome de outro',  $q$insert into public.shepherding_visits (user_id, family_or_person, visit_date) values ('00000000-0000-4000-8000-0000000000a5', 'SMOKE', current_date)$q$);
  perform rls_smoke.expect_blocked('ancião', 'não altera pessoas visitadas de visita alheia', $q$insert into public.shepherding_visit_members (visit_id, member_id) values ('00000000-0000-4000-8000-0000000000c2', '00000000-0000-4000-8000-0000000000b3')$q$);
  perform rls_smoke.expect_blocked('ancião', 'acompanhante precisa ser nomeado (trigger)', $q$insert into public.shepherding_visits (user_id, family_or_person, visit_date, companion_member_id) values (auth.uid(), 'SMOKE', current_date, '00000000-0000-4000-8000-0000000000b3')$q$);

  -- sigilo do texto do relatório: autor lê o próprio relatório, mas NÃO lê o de outro autor
  perform rls_smoke.expect_allowed('ancião', 'lê o próprio relatório de pastoreio', $q$select report from public.shepherding_reports where visit_id = '00000000-0000-4000-8000-0000000000c1'$q$);
  perform rls_smoke.expect_blocked('ancião', 'não lê o texto do relatório de outro autor', $q$select report from public.shepherding_reports where visit_id = '00000000-0000-4000-8000-0000000000c2'$q$);

  -- autoria não forjável (trigger)
  perform rls_smoke.expect_check('ancião', 'não forja created_by_name no INSERT',
    $q$insert into public.shepherding_visits (id, user_id, family_or_person, visit_date, created_by_name, created_by_member_id) values ('00000000-0000-4000-8000-0000000000c9', auth.uid(), 'SMOKE', current_date, 'SMOKE-FORJADO', '00000000-0000-4000-8000-0000000000b3')$q$,
    $q$select created_by_name <> 'SMOKE-FORJADO' from public.shepherding_visits where id = '00000000-0000-4000-8000-0000000000c9'$q$);
  perform rls_smoke.expect_check('ancião', 'não forja created_by_name no UPDATE da própria visita',
    $q$update public.shepherding_visits set created_by_name = 'SMOKE-FORJADO' where id = '00000000-0000-4000-8000-0000000000c1'$q$,
    $q$select created_by_name <> 'SMOKE-FORJADO' from public.shepherding_visits where id = '00000000-0000-4000-8000-0000000000c1'$q$);

  -- convites: cliente nunca lê nem escreve (B1)
  perform rls_smoke.expect_blocked('ancião', 'não cria member_invites direto',   $q$insert into public.member_invites (member_id, token_hash) values ('00000000-0000-4000-8000-0000000000b4', 'smoke-forjado')$q$);
  perform rls_smoke.expect_blocked('ancião', 'não altera member_invites direto', $q$update public.member_invites set used_at = null, expires_at = now() + interval '365 days'$q$);
  perform rls_smoke.expect_blocked('ancião', 'não apaga member_invites direto',  $q$delete from public.member_invites$q$);
  perform rls_smoke.expect_blocked('ancião', 'não lê member_invites direto',     $q$select 1 from public.member_invites$q$);
  perform rls_smoke.expect_blocked('ancião', 'não lê token_hash pelo cliente',   $q$select token_hash from public.member_invites$q$);

  -- não vê dados pessoais de terceiros
  perform rls_smoke.expect_blocked('ancião', 'não lê daily_records de terceiros', $q$select 1 from public.daily_records where user_id = '00000000-0000-4000-8000-0000000000a6'$q$);
  perform rls_smoke.expect_blocked('ancião', 'não lê contacts de terceiros',      $q$select 1 from public.contacts where user_id = '00000000-0000-4000-8000-0000000000a6'$q$);

  -- vínculo e flags só pelo servidor (bloqueado pelo trigger de proteção)
  perform rls_smoke.expect_blocked('ancião', 'não promove a si mesmo a is_admin', $q$update public.profiles set is_admin = true where id = auth.uid()$q$);
  perform rls_smoke.expect_blocked('ancião', 'não reaponta o próprio member_id',  $q$update public.profiles set member_id = '00000000-0000-4000-8000-0000000000b4' where id = auth.uid()$q$);
  perform rls_smoke.expect_blocked('ancião', 'não altera perfil de terceiros',    $q$update public.profiles set shepherding_access = true where id = '00000000-0000-4000-8000-0000000000a2'$q$);
  perform rls_smoke.expect_profile_unchanged('ancião', 'RPC apply_member_default_permissions em perfil de terceiro',
    $q$select public.apply_member_default_permissions('00000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-0000000000b4')$q$,
    '00000000-0000-4000-8000-0000000000a2');
end $do$;

-- ─── 8. Persona: ADMINISTRADOR (a5: is_admin, sem vínculo de irmão) ─────
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a5","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000a5', true);
set local role authenticated;

do $do$
begin
  perform rls_smoke.expect_allowed('administrador', 'lê congregation_members', $q$select 1 from public.congregation_members$q$);
  perform rls_smoke.expect_blocked('administrador', 'não lê member_invites direto', $q$select 1 from public.member_invites$q$);
  perform rls_smoke.expect_blocked('administrador', 'não edita visita de outro autor',  $q$update public.shepherding_visits set family_or_person = 'x' where id = '00000000-0000-4000-8000-0000000000c1'$q$);
  perform rls_smoke.expect_blocked('administrador', 'não exclui visita de outro autor', $q$delete from public.shepherding_visits where id = '00000000-0000-4000-8000-0000000000c1'$q$);
  perform rls_smoke.expect_allowed('administrador', 'lê o próprio relatório de pastoreio', $q$select report from public.shepherding_reports where visit_id = '00000000-0000-4000-8000-0000000000c2'$q$);
  perform rls_smoke.expect_blocked('administrador', 'não lê o texto do relatório de outro autor', $q$select report from public.shepherding_reports where visit_id = '00000000-0000-4000-8000-0000000000c1'$q$);
  perform rls_smoke.expect_blocked('administrador', 'sem talks_access não lê bible_verses', $q$select 1 from public.bible_verses$q$);
  perform rls_smoke.expect_blocked('administrador', 'não lê daily_records de terceiros', $q$select 1 from public.daily_records where user_id = '00000000-0000-4000-8000-0000000000a6'$q$);
  perform rls_smoke.expect_blocked('administrador', 'não lê contacts de terceiros',      $q$select 1 from public.contacts where user_id = '00000000-0000-4000-8000-0000000000a6'$q$);
  perform rls_smoke.expect_blocked('administrador', 'não cria member_invites direto',    $q$insert into public.member_invites (member_id, token_hash) values ('00000000-0000-4000-8000-0000000000b4', 'smoke-forjado')$q$);
  perform rls_smoke.expect_blocked('administrador', 'não lê token_hash pelo cliente',    $q$select token_hash from public.member_invites$q$);
  perform rls_smoke.expect_profile_unchanged('administrador', 'RPC apply_member_default_permissions em perfil de terceiro',
    $q$select public.apply_member_default_permissions('00000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-0000000000b4')$q$,
    '00000000-0000-4000-8000-0000000000a2');
end $do$;

-- ─── 9. Resultado ───────────────────────────────────────────────────────
reset role;

select persona, test, expected,
       case when pass then 'PASS' else 'FAIL' end as result,
       detail
  from rls_smoke.results
 order by id;

do $do$
declare n int;
begin
  select count(*) into n from rls_smoke.results where not pass;
  if n > 0 then
    raise exception 'rls_smoke: % teste(s) FALHARAM — veja a tabela acima', n;
  end if;
end $do$;

rollback;
