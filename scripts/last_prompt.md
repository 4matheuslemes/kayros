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
- `shepherding_access` (`boolean`): libera acessar `/pastoreio` e ver as datas de pastoreio em `/irmaos`. **Padrão para todos os Anciãos**, mas ativável manualmente por um ancião para qualquer outro irmão (ex.: ativar para o Mat
<truncated 11363 bytes>
 Confirmar que nenhuma query de `SELECT` em `/irmaos` e `/pastoreio` filtra mais por `.eq("user_id", user.id)`, permitindo visão congregacional compartilhada para quem tem permissão.
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