"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Shield,
  Search,
  RefreshCw,
  Sparkles,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Clock,
  Users,
  BookOpenText,
  Calendar,
  Layers,
  HeartHandshake,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { MemberCombobox, type MemberOption } from "@/components/pastoreio/member-combobox";
import { createClient } from "@/lib/supabase/client";

export interface AdminUserPermissions {
  id: string;
  email: string;
  full_name: string;
  is_admin: boolean;
  is_elder: boolean;
  talks_access: boolean;
  hours_access: boolean;
  contacts_access: boolean;
  view_members: boolean;
  manage_members: boolean;
  shepherding_access: boolean;
  member_id: string | null;
}

interface PermissionsManagementSectionProps {
  currentUserId?: string;
}

export function PermissionsManagementSection({
  currentUserId,
}: PermissionsManagementSectionProps) {
  const [users, setUsers] = useState<AdminUserPermissions[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedUserIds, setExpandedUserIds] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");

  const fetchUsersAndMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, supabase] = await Promise.all([
        fetch("/api/admin/users", { cache: "no-store" }),
        createClient(),
      ]);

      if (!usersRes.ok) {
        const errData = await usersRes.json().catch(() => ({}));
        throw new Error(errData.error || "Erro ao carregar lista de usuários");
      }

      const usersData: AdminUserPermissions[] = await usersRes.json();
      setUsers(usersData);

      // Auto-expand first user or all if small list
      if (usersData.length <= 4) {
        const expanded: Record<string, boolean> = {};
        for (const u of usersData) expanded[u.id] = true;
        setExpandedUserIds(expanded);
      }

      // Fetch congregation members for linking
      const { data: membersData } = await supabase
        .from("congregation_members")
        .select("id, full_name, appointment, service_status")
        .eq("active", true)
        .order("full_name", { ascending: true });

      if (membersData) {
        setMembers(membersData as MemberOption[]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao carregar dados";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsersAndMembers();
  }, [fetchUsersAndMembers]);

  const toggleExpand = (userId: string) => {
    setExpandedUserIds((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const handleToggle = async (
    targetUser: AdminUserPermissions,
    field: keyof Omit<AdminUserPermissions, "id" | "email" | "full_name" | "member_id">,
    nextValue: boolean
  ) => {
    // Safety check: cannot disable own admin
    if (targetUser.id === currentUserId && field === "is_admin" && !nextValue) {
      toast.error("Você não pode remover seu próprio acesso de administrador.");
      return;
    }

    const previousUsers = [...users];
    // Optimistic update
    setUsers((prev) =>
      prev.map((u) => (u.id === targetUser.id ? { ...u, [field]: nextValue } : u))
    );
    setUpdatingId(targetUser.id);

    try {
      const res = await fetch("/api/admin/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: targetUser.id,
          [field]: nextValue,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Erro ao atualizar permissão");
      }

      const displayName = targetUser.full_name || targetUser.email;
      toast.success(`Permissões atualizadas para ${displayName}`);
    } catch (err: unknown) {
      // Revert optimistic update
      setUsers(previousUsers);
      const msg = err instanceof Error ? err.message : "Falha ao salvar alteração";
      toast.error(msg);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleLinkMember = async (
    targetUser: AdminUserPermissions,
    newMemberId: string | null
  ) => {
    const previousUsers = [...users];
    setUsers((prev) =>
      prev.map((u) => (u.id === targetUser.id ? { ...u, member_id: newMemberId } : u))
    );
    setUpdatingId(targetUser.id);

    try {
      const res = await fetch("/api/admin/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: targetUser.id,
          member_id: newMemberId,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Erro ao vincular membro");
      }

      const linkedName =
        members.find((m) => m.id === newMemberId)?.full_name || "Nenhum";
      toast.success(
        newMemberId
          ? `Vínculo com "${linkedName}" salvo com sucesso`
          : "Vínculo de membro removido"
      );
    } catch (err: unknown) {
      setUsers(previousUsers);
      const msg = err instanceof Error ? err.message : "Falha ao vincular membro";
      toast.error(msg);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleApplyDefaults = async (targetUser: AdminUserPermissions) => {
    if (!targetUser.member_id) {
      toast.error("Vincule um irmão da congregação antes de aplicar os padrões");
      return;
    }

    setUpdatingId(targetUser.id);
    try {
      const res = await fetch("/api/admin/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: targetUser.id,
          member_id: targetUser.member_id,
          applyDefaults: true,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Erro ao aplicar permissões padrão");
      }

      const data = await res.json();
      if (data.profile) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === targetUser.id
              ? {
                  ...u,
                  full_name: data.profile.full_name || u.full_name,
                  is_admin: !!data.profile.is_admin,
                  is_elder: !!data.profile.is_elder,
                  hours_access: !!data.profile.hours_access,
                  contacts_access: data.profile.contacts_access !== false,
                  talks_access: !!data.profile.talks_access,
                  view_members: !!data.profile.view_members,
                  manage_members: !!data.profile.manage_members,
                  shepherding_access: !!data.profile.shepherding_access,
                }
              : u
          )
        );
      }

      const displayName = targetUser.full_name || targetUser.email;
      toast.success(`Padrões da designação aplicados para ${displayName}!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao aplicar padrões";
      toast.error(msg);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }, [users, query]);

  return (
    <Card className="p-4 flex flex-col gap-4 shadow-xs border-[var(--border)]">
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <Shield size={20} className="text-[var(--primary)]" />
          <div>
            <h2 className="text-subheading text-[var(--ink)]">
              Permissões da Congregação
            </h2>
            <p className="text-caption text-[var(--ink-muted)]">
              Controle individual de acessos e funcionalidades (estilo Hourglass).
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={fetchUsersAndMembers}
          disabled={loading}
          className="w-8 h-8 text-[var(--ink-muted)] hover:text-[var(--ink)]"
          title="Recarregar usuários"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </Button>
      </div>

      {users.length > 4 && (
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] pointer-events-none"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="pl-9 h-9 text-body-sm"
          />
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-3 py-6 items-center justify-center text-[var(--ink-muted)]">
          <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          <span className="text-body-sm">Carregando usuários e permissões...</span>
        </div>
      ) : error ? (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-body-sm">
          {error}
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="p-6 text-center text-body-sm text-[var(--ink-muted)] italic">
          Nenhum usuário encontrado.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredUsers.map((user) => {
            const isExpanded = !!expandedUserIds[user.id];
            const isSelf = user.id === currentUserId;
            const linkedMember = members.find((m) => m.id === user.member_id);

            return (
              <div
                key={user.id}
                className="border border-[var(--border)] rounded-xl bg-[var(--surface)] overflow-hidden transition-all shadow-xs"
              >
                {/* Cabeçalho do Usuário */}
                <button
                  type="button"
                  onClick={() => toggleExpand(user.id)}
                  className="w-full p-3.5 text-left flex items-center justify-between gap-3 hover:bg-[var(--background)]/60 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] font-semibold flex items-center justify-center text-sm shrink-0">
                      {(user.full_name || user.email || "?")
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-display font-semibold text-body text-[var(--ink)] truncate">
                          {user.full_name || "Sem nome"}
                        </span>
                        {isSelf && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-[var(--primary)] text-white">
                            Você
                          </span>
                        )}
                        {(user.is_admin || user.is_elder) && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20">
                            {user.is_admin ? "Admin" : "Ancião"}
                          </span>
                        )}
                      </div>
                      <span className="text-caption text-[var(--ink-muted)] truncate">
                        {user.email}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {linkedMember ? (
                      <span className="hidden sm:inline-flex text-2xs px-2 py-0.5 rounded-full bg-[var(--background)] text-[var(--ink-muted)] border border-[var(--border)] truncate max-w-[140px]">
                        {linkedMember.full_name}
                      </span>
                    ) : (
                      <span className="hidden sm:inline-flex text-2xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400">
                        Não vinculado
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronUp size={18} className="text-[var(--ink-muted)]" />
                    ) : (
                      <ChevronDown size={18} className="text-[var(--ink-muted)]" />
                    )}
                  </div>
                </button>

                {/* Conteúdo Expandido: Vínculo + Switches */}
                {isExpanded && (
                  <div className="p-4 pt-2 border-t border-[var(--border)]/70 flex flex-col gap-4 bg-[var(--background)]/30">
                    {/* Bloco 1: Vínculo com cadastro de membro */}
                    <div className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex flex-col gap-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                          <UserCheck size={14} className="text-[var(--primary)]" />
                          <span>Vínculo com Irmão da Congregação</span>
                        </div>

                        {user.member_id && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => handleApplyDefaults(user)}
                            disabled={updatingId === user.id}
                            className="h-7 px-2 text-2xs font-semibold gap-1"
                            title="Aplica automaticamente as permissões recomendadas pela designação do irmão (Ancião, Servo, Pioneiro)"
                          >
                            <Sparkles size={12} className="text-[var(--primary)]" />
                            <span>Aplicar padrões</span>
                          </Button>
                        )}
                      </div>

                      <MemberCombobox
                        members={members}
                        value={user.member_id}
                        onChange={(mId) => handleLinkMember(user, mId)}
                        placeholder="Pesquisar e selecionar irmão da lista..."
                        disabled={updatingId === user.id}
                      />

                      {linkedMember && (
                        <p className="text-2xs text-[var(--ink-muted)]">
                          Vinculado a: <strong>{linkedMember.full_name}</strong>
                          {linkedMember.appointment && (
                            <span> • {linkedMember.appointment === "anciao" ? "Ancião" : "Servo ministerial"}</span>
                          )}
                          {linkedMember.service_status === "pioneiro_regular" && (
                            <span> • Pioneiro regular</span>
                          )}
                        </p>
                      )}
                    </div>

                    {/* Bloco 2: Os 7 interruptores individuais (estilo Hourglass) */}
                    <div className="flex flex-col divide-y divide-[var(--border)]/60 bg-[var(--surface)] border border-[var(--border)] rounded-lg overflow-hidden">
                      {/* 1. is_admin */}
                      <div className="p-3 flex items-start justify-between gap-3">
                        <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                          <div className="flex items-center gap-1.5">
                            <Shield size={14} className="text-[var(--primary)] shrink-0" />
                            <span className="text-body-sm font-semibold text-[var(--ink)]">
                              Administrador / Ancião Responsável
                            </span>
                          </div>
                          <span className="text-caption text-[var(--ink-muted)]">
                            Pode convidar usuários e ativar/desativar permissões de qualquer publicador.
                          </span>
                        </div>
                        <Switch
                          checked={user.is_admin}
                          onCheckedChange={(val) => handleToggle(user, "is_admin", val)}
                          disabled={
                            updatingId === user.id ||
                            (isSelf && user.is_admin)
                          }
                          aria-label="Administrador"
                        />
                      </div>

                      {/* 2. hours_access */}
                      <div className="p-3 flex items-start justify-between gap-3">
                        <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                          <div className="flex items-center gap-1.5">
                            <Clock size={14} className="text-[var(--primary)] shrink-0" />
                            <span className="text-body-sm font-semibold text-[var(--ink)]">
                              Relatório de Horas e Meta
                            </span>
                          </div>
                          <span className="text-caption text-[var(--ink-muted)]">
                            Cronômetro, meta mensal, histórico de horas e relatório (padrão para Pioneiros Regulares).
                          </span>
                        </div>
                        <Switch
                          checked={user.hours_access}
                          onCheckedChange={(val) => handleToggle(user, "hours_access", val)}
                          disabled={updatingId === user.id}
                          aria-label="Relatório de Horas e Meta"
                        />
                      </div>

                      {/* 3. contacts_access */}
                      <div className="p-3 flex items-start justify-between gap-3">
                        <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={14} className="text-[var(--primary)] shrink-0" />
                            <span className="text-body-sm font-semibold text-[var(--ink)]">
                              Interessados e Agenda
                            </span>
                          </div>
                          <span className="text-caption text-[var(--ink-muted)]">
                            Revisitas, estudos bíblicos e calendário de agendamentos.
                          </span>
                        </div>
                        <Switch
                          checked={user.contacts_access}
                          onCheckedChange={(val) =>
                            handleToggle(user, "contacts_access", val)
                          }
                          disabled={updatingId === user.id}
                          aria-label="Interessados e Agenda"
                        />
                      </div>

                      {/* 4. talks_access */}
                      <div className="p-3 flex items-start justify-between gap-3">
                        <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                          <div className="flex items-center gap-1.5">
                            <BookOpenText size={14} className="text-[var(--primary)] shrink-0" />
                            <span className="text-body-sm font-semibold text-[var(--ink)]">
                              Discursos
                            </span>
                          </div>
                          <span className="text-caption text-[var(--ink-muted)]">
                            Editor de esboços, pesquisa bíblica e Modo Discurso (padrão para Anciãos e Servos).
                          </span>
                        </div>
                        <Switch
                          checked={user.talks_access}
                          onCheckedChange={(val) => handleToggle(user, "talks_access", val)}
                          disabled={updatingId === user.id}
                          aria-label="Discursos"
                        />
                      </div>

                      {/* 5. view_members */}
                      <div className="p-3 flex items-start justify-between gap-3">
                        <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                          <div className="flex items-center gap-1.5">
                            <Users size={14} className="text-[var(--primary)] shrink-0" />
                            <span className="text-body-sm font-semibold text-[var(--ink)]">
                              Ver Irmãos e Grupos
                            </span>
                          </div>
                          <span className="text-caption text-[var(--ink-muted)]">
                            Visualizar a lista da congregação e os 6 Grupos de Serviço.
                          </span>
                        </div>
                        <Switch
                          checked={user.view_members}
                          onCheckedChange={(val) => handleToggle(user, "view_members", val)}
                          disabled={updatingId === user.id}
                          aria-label="Ver Irmãos e Grupos"
                        />
                      </div>

                      {/* 6. manage_members */}
                      <div className="p-3 flex items-start justify-between gap-3">
                        <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                          <div className="flex items-center gap-1.5">
                            <Layers size={14} className="text-[var(--primary)] shrink-0" />
                            <span className="text-body-sm font-semibold text-[var(--ink)]">
                              Gerenciar Irmãos e Grupos
                            </span>
                          </div>
                          <span className="text-caption text-[var(--ink-muted)]">
                            Adicionar/editar irmãos, criar grupos e transferir publicadores entre grupos.
                          </span>
                        </div>
                        <Switch
                          checked={user.manage_members}
                          onCheckedChange={(val) =>
                            handleToggle(user, "manage_members", val)
                          }
                          disabled={updatingId === user.id}
                          aria-label="Gerenciar Irmãos e Grupos"
                        />
                      </div>

                      {/* 7. shepherding_access */}
                      <div className="p-3 flex items-start justify-between gap-3">
                        <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                          <div className="flex items-center gap-1.5">
                            <HeartHandshake size={14} className="text-[var(--primary)] shrink-0" />
                            <span className="text-body-sm font-semibold text-[var(--ink)]">
                              Registro de Pastoreio
                            </span>
                          </div>
                          <span className="text-caption text-[var(--ink-muted)]">
                            Ver todas as visitas de pastoreio da congregação e registrar novas visitas (só edita/exclui as próprias).
                          </span>
                        </div>
                        <Switch
                          checked={user.shepherding_access}
                          onCheckedChange={(val) =>
                            handleToggle(user, "shepherding_access", val)
                          }
                          disabled={updatingId === user.id}
                          aria-label="Registro de Pastoreio"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
