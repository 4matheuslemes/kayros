import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Modelo de permissões da congregação (estilo Hourglass).
 *
 * As colunas vivem em `profiles` (migration 017). Toda a regra de derivação
 * fica aqui para que servidor (guardas de rota) e cliente (menus/dashboard)
 * usem exatamente a mesma lógica.
 */

export interface ProfilePermissionRow {
  is_admin?: boolean | null;
  is_elder?: boolean | null;
  talks_access?: boolean | null;
  hours_access?: boolean | null;
  contacts_access?: boolean | null;
  view_members?: boolean | null;
  manage_members?: boolean | null;
  shepherding_access?: boolean | null;
  member_id?: string | null;
}

export const PROFILE_PERMISSION_COLUMNS =
  "is_admin, is_elder, talks_access, hours_access, contacts_access, view_members, manage_members, shepherding_access, member_id";

export interface UserPermissions {
  /** auth.uid() do usuário logado (null quando não carregado). */
  userId: string | null;
  /** Vínculo do login com `congregation_members.id`. */
  memberId: string | null;
  isAdmin: boolean;
  isElder: boolean;
  /** Pode acessar /convidar e gerenciar permissões de outros usuários. */
  isElderOrAdmin: boolean;
  canUseHours: boolean;
  canUseContacts: boolean;
  canUseTalks: boolean;
  canViewMembers: boolean;
  canManageMembers: boolean;
  canUseShepherding: boolean;
}

export const EMPTY_PERMISSIONS: UserPermissions = {
  userId: null,
  memberId: null,
  isAdmin: false,
  isElder: false,
  isElderOrAdmin: false,
  canUseHours: false,
  canUseContacts: false,
  canUseTalks: false,
  canViewMembers: false,
  canManageMembers: false,
  canUseShepherding: false,
};

export function derivePermissions(
  profile: ProfilePermissionRow | null | undefined,
  userId: string | null = null
): UserPermissions {
  if (!profile) return { ...EMPTY_PERMISSIONS, userId };

  const isAdmin = !!profile.is_admin;
  const isElder = !!profile.is_elder;
  const isElderOrAdmin = isAdmin || isElder;

  return {
    userId,
    memberId: profile.member_id ?? null,
    isAdmin,
    isElder,
    isElderOrAdmin,
    canUseHours: !!profile.hours_access,
    canUseContacts: !!profile.contacts_access,
    canUseTalks: !!profile.talks_access,
    canViewMembers:
      isElderOrAdmin ||
      !!profile.view_members ||
      !!profile.manage_members ||
      !!profile.shepherding_access,
    canManageMembers: isElderOrAdmin || !!profile.manage_members,
    canUseShepherding: isElderOrAdmin || !!profile.shepherding_access,
  };
}

/**
 * Carrega as colunas de permissão do usuário e devolve as flags derivadas.
 * Usado pelas páginas server-side para proteger rotas (`redirect("/")`).
 * Falha fechada: sem perfil legível => sem nenhuma permissão.
 */
export async function fetchUserPermissions(
  supabase: SupabaseClient,
  userId: string
): Promise<UserPermissions> {
  const { data: profile } = await supabase
    .from("profiles")
    .select(PROFILE_PERMISSION_COLUMNS)
    .eq("id", userId)
    .single();

  return derivePermissions(profile as ProfilePermissionRow | null, userId);
}

/**
 * Um irmão da lista é "o próprio usuário logado" quando seu id é o `member_id`
 * do perfil. Fallback para bases ainda sem vínculo: registro `is_self` criado
 * por este mesmo usuário.
 */
export function isCurrentUserMember(
  member: { id: string; is_self?: boolean | null; user_id?: string | null },
  who: { memberId: string | null; userId: string | null }
): boolean {
  if (who.memberId && member.id === who.memberId) return true;
  return !!member.is_self && !!who.userId && member.user_id === who.userId;
}

// ─────────────────────────────────────────────────────────────
// Barra flutuante inferior
// ─────────────────────────────────────────────────────────────
export type FloatingNavId =
  | "inicio"
  | "interessados"
  | "discursos"
  | "irmaos"
  | "pastoreio"
  | "historico";

export function isFloatingItemAllowed(
  id: FloatingNavId,
  permissions: UserPermissions
): boolean {
  switch (id) {
    case "interessados":
      return permissions.canUseContacts;
    case "historico":
      return permissions.canUseHours;
    case "discursos":
      return permissions.canUseTalks;
    case "irmaos":
      return permissions.canViewMembers;
    case "pastoreio":
      return permissions.canUseShepherding;
    case "inicio":
    default:
      return true;
  }
}
