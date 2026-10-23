<USER_REQUEST>
# [Arquitetura + Permissões] Hub da Congregação Estilo Hourglass: Permissões Granulares, Pastoreio Compartilhado (com autoria) e Novo Início Adaptativo

Pré-requisito já executado por mim no Supabase: a migration `017_permissions_and_shared_shepherding.sql`. Salvar uma cópia **idêntica** do arquivo anexado em `supabase/migrations/017_permissions_and_shared_shepherding.sql`.

O Kairós evoluiu: não é mais apenas um app de relatar horas para pioneiros. Agora ele é um Hub da Congregação (inspirado no modelo de permissões do Hourglass), onde **todos os Anciãos são responsáveis/administradores** e podem ativar ou desativar funcionalidades individualmente para qualquer publicador.

---

## 1. Modelo de Permissões e Vínculo com Irmão (`profiles`)

A tabela `profiles` agora possui (além de `is_admin`, `is_elder`, `talks_access`):
- `member_id` (`uuid`, FK para `congregation_members.id`): vincula o login do usuário ao cadastro dele na lista dos 119 irmãos da congregação.
- `hours_access` (`boolean`): libera Registro de Horas (cronômetro/manual), Meta do Mês, Histórico de Horas e Relatório Mensal. **Somente Pioneiros Regulares** recebem isso por padrão (ou quem um ancião ativar manualmente).
- `contacts_access` (`boolean`, default `true`): libera Interessados (Revisitas, Estudos e o widget Agenda). **Liberado para todos por padrão** (mas desativável pelo ancião).
- `talks_access` (`boolean`): libera o módulo Discursos (Editor, Bíblia, Modo Discurso). **Padrão para Anciãos e Servos Ministeriais** (mas ativável/desativável para qualquer um).
- `view_members` (`boolean`): libera visualizar `/irmaos` e os Grupos de Serviço.
- `manage_members` (`boolean`): libera criar/editar/excluir irmãos e grupos de serviço em `/irmaos`.
- `shepherding_access` (`boolean`): libera acessar `/pastoreio` e ver as datas de pastoreio em `/irmaos`. **Padrão para todos os Anciãos**, mas ativável manualmente por um ancião para qualquer outro irmão (ex.: ativar para o Mateus Brites).

### 1.1 Contexto Global de Permissões (`user-permissions-context.tsx` e `layout.tsx`)
Atualizar o carregamento do perfil no servidor (`src/app/(app)/layout.tsx`) e o `UserPermissionsContext` para expor flags claras e derivadas:
- `isElderOrAdmin`: `profile.is_admin || profile.is_elder` (quem pode acessar `/convidar` e gerenciar permissões de outros usuários).
- `canUseHours`: `profile.hours_access`
- `canUseContacts`: `profile.contacts_access`
- `canUseTalks`: `profile.talks_access`
- `canViewMembers`: `profile.is_admin || profile.is_elder || profile.view_members || profile.manage_members || profile.shepherding_access`
- `canManageMembers`: `profile.is_admin || profile.is_elder || profile.manage_members`
- `canUseShepherding`: `profile.is_admin || profile.is_elder || profile.shepherding_access`
- `memberId`: `profile.member_id` (para saber quem é a pessoa na tabela `congregation_members` nolugar de depender apenas de `is_self`).

---

## 2. Pastoreio Compartilhado entre Autorizados (Ver tudo, Editar/Excluir SÓ o próprio autor)

Antes, `congregation_members`, `service_groups` e `shepherding_visits` eram filtrados por `user_id = auth.uid()`. Na migration 017, a RLS já foi atualizada para que **qualquer usuário autorizado veja a mesma base da congregação**. Você precisa ajustar as queries e a UI no código:

### 2.1 Remover filtros `.eq("user_id", user.id)` nas leituras de Irmãos, Grupos e Pastoreio
- Em `/irmaos` e `/pastoreio`: ao fazer `SELECT` em `congregation_members`, `service_groups`, `shepherding_visits` e `shepherding_visit_members`, **não filtrar por `user_id`**. A RLS do banco (`has_view_members_access()` e `has_shepherding_access()`) já garante a segurança, permitindo que outro ancião (ex.: irmão Leandro) ou um irmão autorizado veja os 119 irmãos, os 6 grupos e todas as visitas realizadas.
- Identificação de "Você" (`isCurrentUser`): um irmão da lista `congregation_members` é o próprio usuário logado quando `member.id === profile.member_id` (ou fallback `member.is_self && member.user_id === user.id`). Usar essa regra para:
  - Mostrar o badge "Você" na lista de irmãos.
  - Excluir a própria pessoa dos seletores de "Quem foi visitado" e "Quem acompanhou" quando ela mesma estiver registrando uma visita!

### 2.2 Autoria da Visita de Pastoreio ("Quem fez a visita" + Trava de Edição/Exclusão)
A tabela `shepherding_visits` agora tem `created_by_name` e `created_by_member_id` (preenchidos automaticamente por trigger no banco no momento do insert, baseados no `user_id` de quem criou).
- **Em cada card da lista de `/pastoreio` (`pastoreio-client.tsx`) e no detalhe (`pastoreio-detail-sheet.tsx`)**:
  - Exibir claramente quem conduziu/registrou a visita: ex.: **"Realizada por: {visit.created_by_name}"** (e se tiver acompanhante: **"• Acompanhante: {nome do acompanhante}"**).
  - Assim, quando o irmão Leandro entrar em `/pastoreio`, ele verá todas as visitas que o Matheus fez até hoje (quem fez, quem acompanhou, quem foi visitado, data da visita, data da próxima visita sugerida e o relatório completo).
- **Regra estrita de Edição e Exclusão (`visit.user_id === currentUserId`)**:
  - Os botões de **Editar** e **Excluir** uma visita de pastoreio só devem aparecer se `visit.user_id === currentUserId` (ou seja, somente o autor que registrou aquela visita pode editá-la ou apagá-la).
  - Se a visita foi registrada por outro irmão (`visit.user_id !== currentUserId`), o `PastoreioDetailSheet` abre em **modo somente leitura** (mostra todos os dados e o relatório completo, com uma nota discreta no rodapé: *"Visita registrada por {visit.created_by_name} (somente leitura)"*, sem botões de editar/excluir).

### 2.3 Permissão de Visualização vs. Edição em `/irmaos`
- A rota `/irmaos` exige `canViewMembers` no servidor (`redirect("/")` se não tiver).
- Se o usuário tem `canViewMembers`, mas **não** tem `canManageMembers`: ele vê a lista de irmãos e os Grupos de Serviço normalmente, mas os botões de "Novo irmão", "Editar irmão", "Novo grupo", "Editar/Excluir grupo", "Adicionar ao grupo", "Transferir" e "Remover do grupo" ficam ocultos.
- Os dados de "última visita", "próxima visita", chip "Na hora de visitar" e o histórico de visitas dentro do `member-detail-sheet.tsx` só são exibidos se o usuário também tiver `canUseShepherding`.

---

## 3. Nova Tela de Início Adaptativa (`/` — Dashboard para Pioneiros vs. Não-Pioneiros)

Hoje o Dashboard (`dashboard-client.tsx`) assume que todo mundo é pioneiro relatando horas. Agora ele deve se montar dinamicamente conforme as permissões do usuário:

1. **Sempre visível para TODOS**:
   - `AppHeader` (Saudação + botão Menu em pílula).
   - `DailyEncouragement` (frase espiritual do dia).
2. **Bloco deHoras — SOMENTE se `canUseHours === true`**:
   - `HoursRegistrationCard` (card de bilhete do cronômetro/manual).
   - `MonthlyGoalCard` (Meta do Mês).
   - *(Se `canUseHours === false`, esses dois cards NÃO são renderizados, e o atalho `?quickstart=1` é ignorado).*
3. **Bloco de Interessados e Agenda — SOMENTE se `canUseContacts === true`**:
   - Badges de Interessados (Revisitas e Estudos ativos).
   - `AgendaCalendar` (compromissos de hoje, próximos dias e atrasados).
   - `LetterMeetingShortcut` (atalho compacto de Cartas).
4. **NOVO Card no Início: "Cuidado Pastoral & Congregação" — visível quando `canUseShepherding || canViewMembers`**:
   - Para que um Ancião que **não** é pioneiro (ou um ancião que é pioneiro) tenha uma tela inicial rica e útil logo ao abrir o app:
   - Mostrar um card elegante no padrão do design system (`rounded-lg`, `bg-surface`) com:
     - Se `canUseShepherding`: contagem rápida de quantos irmãos estão **"Na hora de visitar"** (levando direto para `/irmaos?filter=due`), a data/nome da última visita de pastoreio registrada na congregação, e dois botões rápidos de ação: **"Nova visita de pastoreio"** (levando para `/pastoreio`) e **"Ver Pastoreio"**.
     - Se `canViewMembers`: atalho rápido para **"Grupos de Serviço"** e **"Lista de Irmãos"** (`/irmaos`).
5. **NOVO Card no Início: "Meu Grupo de Serviço" — quando o usuário tem `member_id` vinculado a um grupo**:
   - Exibir um card compacto mostrando o nome do grupo do usuário (ex.: *"Salão do Reino • Consideração às 8:15h"*), o Superintendente e o Ajudante daquele grupo.

---

## 4. Navegação e Proteção de Rotas (`bottom-nav.tsx`, `nav-menu.tsx` e páginas)

- **Menu em Pílula (`nav-menu.tsx`)**: mostrar cada item somente se a permissão correspondente estiver ativa:
  - **Início** (`/`) — sempre visível.
  - **Interessados** (`/contatos`) — só se `canUseContacts`.
  - **Histórico e Progresso** (`/historico`) — só se `canUseHours`.
  - **Relatório** (`/relatorio`) — só se `canUseHours`.
  - **Discursos** (`/discursos`) — só se `canUseTalks`.
  - **Irmãos e Grupos** (`/irmaos`) — só se `canViewMembers`.
  - **Registro de Pastoreio** (`/pastoreio`) — só se `canUseShepherding`.
  - **Perfil** (`/perfil`) — sempre visível.
  - **Permissões e Convites** (`/convidar`) — só se `isElderOrAdmin`.
- **Barra Flutuante Inferior (`bottom-nav.tsx`)**: filtrar `FLOATING_NAV_ITEMS` pelas permissões do usuário (ex.: se `interessados` estiver desativado para alguém, não mostrar o item).
- **Proteção no Servidor (`page.tsx`)**:
  - `/historico` e `/relatorio`: exigir `hours_access` (se `false`, `redirect("/")`).
  - `/contatos`: exigir `contacts_access` (se `false`, `redirect("/")`).
  - `/discursos/**`: continuar exigindo `talks_access`.
  - `/irmaos`: exigir `canViewMembers`.
  - `/pastoreio`: exigir `canUseShepherding`.
  - `/convidar`: aceitar `profile.is_admin || profile.is_elder`.
- **Em `/perfil` (`perfil-client.tsx`)**:
  - Esconder os controles exclusivos de meta mensal de horas (`monthly_goal_hours`) e programação de horas (`working_days`) quando `canUseHours === false` (para não poluir o Perfil de quem não relata horas no app).
  - No fluxo de `/onboarding`: se o usuário recém-convidado já tiver `hours_access === false` (não é pioneiro), pular as etapas de "Meta mensal de horas" e "Dias programados de campo", pedindo apenas a confirmação do nome (ou concluindo direto se já estiver vinculado a um `member_id`).

---

## 5. Página de "Permissões e Convites da Congregação" (`/convidar` — estilo Hourglass)

Transformar `/convidar` na central onde qualquer **Ancião / Administrador** (`is_admin || is_elder`) gerencia os acessos:

### 5.1 Vincular ao convidar (ou para contas existentes)
- No formulário de **Gerar Convite**, adicionar um seletor opcional **"Vincular ao irmão da congregação"** (`member-combobox.tsx` com busca direta no input, listando os 119 irmãos de `congregation_members`).
- Se um irmão for selecionado ao gerar o convite (ou vinculado depois na lista de usuários): chamar `supabase.rpc('apply_member_default_permissions', { p_user_id, p_member_id })` via service role na API. Isso já preenche o `full_name` do perfil e liga automaticamente os interruptores padrão daquele irmão (ex.: se for Ancião, já ativa admin, pastoreio, irmãos e discursos; se for Pioneiro Regular, já ativa horas; se for Servo, já ativa discursos!).

### 5.2 Painel de Permissões por Usuário (Estilo Hourglass)
- Na lista de usuários cadastrados em `/convidar` (carregada via `/api/admin/users`, que agora deve aceitar `is_admin || is_elder`):
- Mostrar o nome do usuário, e-mail, a qual cadastro de `congregation_members` ele está vinculado (com opção de vincular/trocar usando `member-combobox.tsx` + botão "Aplicar padrões da designação"), e os **interruptores (Switches) individuais** com título e descrição curta no estilo Hourglass:
  1. **Administrador / Ancião Responsável (`is_admin`)** — *"Pode convidar usuários e ativar/desativar permissões de qualquer publicador."*
  2. **Relatório de Horas e Meta (`hours_access`)** — *"Cronômetro, meta mensal, histórico de horas e relatório (padrão para Pioneiros Regulares)."*
  3. **Interessados e Agenda (`contacts_access`)** — *"Revisitas, estudos bíblicos e calendário de agendamentos."*
  4. **Discursos (`talks_access`)** — *"Editor de esboços, pesquisa bíblica e Modo Discurso (padrão para Anciãos e Servos)."*
  5. **Ver Irmãos e Grupos (`view_members`)** — *"Visualizar a lista da congregação e os 6 Grupos de Serviço."*
  6. **Gerenciar Irmãos e Grupos (`manage_members`)** — *"Adicionar/editar irmãos, criar grupos e transferir publicadores entre grupos."*
  7. **Registro de Pastoreio (`shepherding_access`)** — *"Ver todas as visitas de pastoreio da congregação e registrar novas visitas (só edita/exclui as próprias)."*
- Criar/atualizar a rota `POST /api/admin/permissions` (usando service role após validar no servidor que o chamador tem `is_admin || is_elder`) para salvar alterações de qualquer um desses switches ou do vínculo `member_id` com atualização otimista e toast de confirmação.
- Impedir que o usuário desative o próprio `is_admin` de si mesmo por acidente.

## Verification Plan (o que o agente faz)

1. `tsc --noEmit` e `npm run build` limpos.
2. Confirmar que nenhuma query de `SELECT` em `/irmaos` e `/pastoreio` filtra mais por `.eq("user_id", user.id)`, permitindo visão congregacional compartilhada para quem tem permissão.
3. Confirmar que na UI de `/pastoreio` os botões de Editar e Excluir só aparecem quando `visit.user_id === currentUserId`, e que o nome de quem realizou a visita (`created_by_name`) é exibido em todas as visitas.
4. Confirmar que quando `hours_access === false`, o Dashboard oculta os cards de Horas/Meta e exibe o novo painel adaptativo (Interessados + Cuidado Pastoral/Grupos conforme permissões).

(Os testes em tela e com outras contas eu faço manualmente.)
</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-10-23T13:25:38-04:00.

The user's current state is as follows:
Active Document: c:\Users\glauc\.gemini\antigravity-ide\scratch\jw\supabase\migrations\017_permissions_and_shared_shepherding.sql (LANGUAGE_UNSPECIFIED)
Cursor is on line: 1
Other open documents:
- c:\Users\glauc\.gemini\antigravity-ide\scratch\jw\supabase\migrations\012_talks_core.sql (LANGUAGE_SQL)
- c:\Users\glauc\.gemini\antigravity-ide\scratch\jw\supabase\migrations\011_talks_access_and_profile_protection.sql (LANGUAGE_UNSPECIFIED)
- c:\Users\glauc\.gemini\antigravity-ide\scratch\jw\supabase\migrations\010_shepherding_visits.sql (LANGUAGE_SQL)
- c:\Users\glauc\.gemini\antigravity-ide\scratch\jw\supabase\migrations\017_permissions_and_shared_shepherding.sql (LANGUAGE_UNSPECIFIED)
- c:\Users\glauc\.gemini\antigravity-ide\scratch\jw\supabase\migrations\016_service_groups.sql (LANGUAGE_UNSPECIFIED)
Running terminal commands:
- npm run dev (in c:\Users\glauc\.gemini\antigravity-ide\scratch\jw, running for 30m7s)
</ADDITIONAL_METADATA>
<USER_SETTINGS_CHANGE>
The user changed setting `Model Selection` from Gemini 3.8 Flash (High) to Claude Sonnet 5.5 (High). No need to comment on this change if the user doesn't ask about it. If reporting what model you are, please use a human readable name instead of the exact string.
</USER_SETTINGS_CHANGE>