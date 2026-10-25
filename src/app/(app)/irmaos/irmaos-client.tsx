"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useUserPermissions } from "@/contexts/user-permissions-context";
import { isCurrentUserMember } from "@/lib/permissions";
import {
  Users,
  Plus,
  Search,
  ArrowUpDown,
  Calendar,
  CalendarClock,
  Shield,
  ChevronRight,
  ArrowLeft,
  X,
  Clock,
  Pencil,
  UserPlus,
  ArrowRightLeft,
  UserMinus,
  UserCheck,
} from "lucide-react";
import { formatDistanceToNow, parseISO, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/client";
import { PastoreioLockGate } from "@/components/pastoreio/pastoreio-lock-gate";
import { PastoreioDetailSheet } from "@/components/pastoreio/pastoreio-detail-sheet";
import { PastoreioFormSheet } from "@/components/pastoreio/pastoreio-form-sheet";
import { MemberFormSheet } from "@/components/irmaos/member-form-sheet";
import { MemberDetailSheet } from "@/components/irmaos/member-detail-sheet";
import { MemberDetailPanel } from "@/components/irmaos/member-detail-panel";
import { ServiceGroupFormSheet } from "@/components/irmaos/service-group-form-sheet";
import { AddMembersToGroupSheet } from "@/components/irmaos/add-members-to-group-sheet";
import { TransferMemberDialog } from "@/components/irmaos/transfer-member-dialog";
import type {
  CongregationMember,
  MemberWithLastVisit,
  ServiceGroup,
} from "@/lib/types/congregation";
import type { ShepherdingVisit } from "@/lib/types/pastoreio";
import { cn } from "@/lib/utils";

type FilterType =
  | "todos"
  | "na_hora"
  | "anciaos"
  | "servos"
  | "pioneiros"
  | "publicadores"
  | "nao_batizados"
  | "arquivados";

type SortByType = "nome" | "tempo_sem_visita";

interface IrmaosClientProps {
  userId: string;
}

export function IrmaosClient({ userId }: IrmaosClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // A tela é puramente governada pelo parâmetro "view" (grupos vs publicadores)
  const currentView = searchParams?.get("view") || searchParams?.get("tab");
  const isGruposView = currentView === "grupos";

  const initialFilterParam = searchParams?.get("filter");
  const initialFilter: FilterType =
    initialFilterParam === "na_hora" || initialFilterParam === "due"
      ? "na_hora"
      : "todos";

  const {
    isElderOrAdmin,
    canManageMembers,
    canUseShepherding,
    memberId,
  } = useUserPermissions();

  const [isUnlocked, setIsUnlocked] = useState<boolean | null>(null);
  const [members, setMembers] = useState<MemberWithLastVisit[]>([]);
  const [groups, setGroups] = useState<ServiceGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros e busca para "Todos os publicadores"
  const [filter, setFilter] = useState<FilterType>(initialFilter);
  const [groupFilter, setGroupFilter] = useState<string>("todos");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortByType>("nome");

  // Painéis de Publicadores
  const [memberFormOpen, setMemberFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<CongregationMember | null>(null);
  const [selectedMember, setSelectedMember] = useState<MemberWithLastVisit | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  // Painéis de Grupos de Serviço
  const [groupFormOpen, setGroupFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ServiceGroup | null>(null);
  const [addMembersGroup, setAddMembersGroup] = useState<ServiceGroup | null>(null);
  const [transferMember, setTransferMember] = useState<CongregationMember | null>(null);

  // Integração com visitas de pastoreio
  const [visitFormOpen, setVisitFormOpen] = useState(false);
  const [preselectedMemberId, setPreselectedMemberId] = useState<string | null>(null);
  const [detailVisit, setDetailVisit] = useState<ShepherdingVisit | null>(null);
  const [editingVisit, setEditingVisit] = useState<ShepherdingVisit | null>(null);
  const [detailVisitedNames, setDetailVisitedNames] = useState<string[]>([]);

  const today = format(new Date(), "yyyy-MM-dd");

  // Check PIN / biometrics
  useEffect(() => {
    const pin = typeof window !== "undefined" ? localStorage.getItem("app_pin_hash") : null;
    if (!pin) {
      setIsUnlocked(true);
    } else {
      setIsUnlocked(false);
    }
  }, []);

  // Fetch all members, service groups, and shepherding visits in parallel
  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    try {
      const [membersRes, visitMembersRes, groupsRes] = await Promise.all([
        supabase
          .from("congregation_members")
          .select("*")
          .order("full_name", { ascending: true }),
        canUseShepherding
          ? supabase
              .from("shepherding_visit_members")
              .select("member_id, visit:shepherding_visits(id, visit_date, next_visit_date, created_at, companion, companion_member_id)")
          : Promise.resolve({ data: [] as any[], error: null }),
        supabase
          .from("service_groups")
          .select("*")
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true }),
      ]);

      if (membersRes.error) {
        console.error("Error fetching members:", membersRes.error);
        toast.error("Erro ao carregar congregação");
        return;
      }

      if (groupsRes.data) {
        setGroups(groupsRes.data as ServiceGroup[]);
      }

      interface MemberVisitSummary {
        last_visit_date: string | null;
        last_visit_companion: string | null;
        next_visit_date: string | null;
      }
      const visitsByMember = new Map<string, MemberVisitSummary>();

      if (visitMembersRes.data) {
        for (const row of visitMembersRes.data) {
          const v = (row as any).visit as ShepherdingVisit | null;
          if (!v) continue;

          const memberIdStr = row.member_id;
          const existing = visitsByMember.get(memberIdStr);

          if (!existing) {
            visitsByMember.set(memberIdStr, {
              last_visit_date: v.visit_date,
              last_visit_companion: v.companion || null,
              next_visit_date: v.next_visit_date || null,
            });
          } else {
            let latestDate = existing.last_visit_date;
            let latestCompanion = existing.last_visit_companion;
            if (
              !latestDate ||
              (v.visit_date && v.visit_date.localeCompare(latestDate) > 0)
            ) {
              latestDate = v.visit_date;
              latestCompanion = v.companion || null;
            }

            let nextDate = existing.next_visit_date;
            if (v.next_visit_date) {
              if (!nextDate || v.next_visit_date.localeCompare(nextDate) < 0) {
                nextDate = v.next_visit_date;
              }
            }

            visitsByMember.set(memberIdStr, {
              last_visit_date: latestDate,
              last_visit_companion: latestCompanion,
              next_visit_date: nextDate,
            });
          }
        }
      }

      const merged: MemberWithLastVisit[] = (membersRes.data || []).map((m: any) => {
        const visitInfo = visitsByMember.get(m.id);
        return {
          ...m,
          last_visit_date: visitInfo?.last_visit_date || null,
          last_visit_companion: visitInfo?.last_visit_companion || null,
          next_visit_date: visitInfo?.next_visit_date || null,
        };
      });

      setMembers(merged);

      // Atualiza selectedMember se ainda estiver selecionado
      setSelectedMember((cur) => {
        if (!cur) return null;
        return merged.find((m) => m.id === cur.id) || null;
      });
    } catch (err) {
      console.error(err);
      toast.error("Erro inesperado ao buscar dados");
    } finally {
      setLoading(false);
    }
  }, [canUseShepherding]);

  useEffect(() => {
    if (isUnlocked === true) {
      fetchData();
    }
  }, [isUnlocked, fetchData]);

  // Contagens para os chips de filtro na visão "Todos os publicadores"
  const counts = useMemo(() => {
    let todos = 0;
    let na_hora = 0;
    let anciaos = 0;
    let servos = 0;
    let pioneiros = 0;
    let publicadores = 0;
    let nao_batizados = 0;
    let arquivados = 0;

    for (const m of members) {
      if (!m.active) {
        arquivados++;
        continue;
      }

      todos++;

      if (!m.is_self && m.next_visit_date && m.next_visit_date <= today) {
        na_hora++;
      }

      if (m.appointment === "anciao") anciaos++;
      if (m.appointment === "servo_ministerial") servos++;
      if (
        m.service_status === "pioneiro_regular" ||
        m.service_status === "pioneiro_auxiliar_continuo"
      ) {
        pioneiros++;
      }
      if (m.service_status === "publicador_batizado") publicadores++;
      if (m.service_status === "publicador_nao_batizado") nao_batizados++;
    }

    return { todos, na_hora, anciaos, servos, pioneiros, publicadores, nao_batizados, arquivados };
  }, [members, today]);

  // Lista filtrada e ordenada de "Todos os publicadores"
  const filteredAndSortedMembers = useMemo(() => {
    let list = members;

    // 1. Filtro por chip
    if (filter === "arquivados") {
      list = list.filter((m) => !m.active);
    } else {
      list = list.filter((m) => m.active);
      if (filter === "na_hora") {
        list = list.filter((m) => !m.is_self && m.next_visit_date && m.next_visit_date <= today);
      } else if (filter === "anciaos") {
        list = list.filter((m) => m.appointment === "anciao");
      } else if (filter === "servos") {
        list = list.filter((m) => m.appointment === "servo_ministerial");
      } else if (filter === "pioneiros") {
        list = list.filter(
          (m) =>
            m.service_status === "pioneiro_regular" ||
            m.service_status === "pioneiro_auxiliar_continuo"
        );
      } else if (filter === "publicadores") {
        list = list.filter((m) => m.service_status === "publicador_batizado");
      } else if (filter === "nao_batizados") {
        list = list.filter((m) => m.service_status === "publicador_nao_batizado");
      }
    }

    // 2. Filtro por grupo de serviço
    if (groupFilter !== "todos") {
      if (groupFilter === "sem_grupo") {
        list = list.filter((m) => !m.group_id);
      } else {
        list = list.filter((m) => m.group_id === groupFilter);
      }
    }

    // 3. Busca por nome instantânea
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((m) => m.full_name.toLowerCase().includes(q));
    }

    // 4. Ordenação
    return [...list].sort((a, b) => {
      if (sortBy === "tempo_sem_visita") {
        if (a.is_self && !b.is_self) return 1;
        if (!a.is_self && b.is_self) return -1;
        if (a.is_self && b.is_self) return a.full_name.localeCompare(b.full_name, "pt-BR");

        if (!a.last_visit_date && b.last_visit_date) return -1;
        if (a.last_visit_date && !b.last_visit_date) return 1;
        if (!a.last_visit_date && !b.last_visit_date) {
          return a.full_name.localeCompare(b.full_name, "pt-BR");
        }

        const dateComp = (a.last_visit_date || "").localeCompare(b.last_visit_date || "");
        if (dateComp !== 0) return dateComp;
        return a.full_name.localeCompare(b.full_name, "pt-BR");
      }

      return a.full_name.localeCompare(b.full_name, "pt-BR");
    });
  }, [members, filter, groupFilter, query, sortBy, today]);

  // Mapa de membros por grupo
  const groupMembersMap = useMemo(() => {
    const map = new Map<string, MemberWithLastVisit[]>();
    for (const g of groups) {
      const list = members.filter((m) => m.active && m.group_id === g.id);
      list.sort((a, b) => {
        const aIsOverseer = a.id === g.overseer_id;
        const bIsOverseer = b.id === g.overseer_id;
        if (aIsOverseer && !bIsOverseer) return -1;
        if (!aIsOverseer && bIsOverseer) return 1;

        const aIsAssistant = a.id === g.assistant_id;
        const bIsAssistant = b.id === g.assistant_id;
        if (aIsAssistant && !bIsAssistant) return -1;
        if (!aIsAssistant && bIsAssistant) return 1;

        return a.full_name.localeCompare(b.full_name, "pt-BR");
      });
      map.set(g.id, list);
    }
    return map;
  }, [groups, members]);

  // Publicadores ativos sem grupo
  const unassignedMembers = useMemo(() => {
    return members
      .filter((m) => m.active && !m.group_id)
      .sort((a, b) => a.full_name.localeCompare(b.full_name, "pt-BR"));
  }, [members]);

  const formatLastVisit = (dateStr: string | null) => {
    if (!dateStr) return "sem visita registrada";
    try {
      const rel = formatDistanceToNow(parseISO(dateStr), {
        locale: ptBR,
        addSuffix: true,
      });
      return `última visita: ${rel}`;
    } catch {
      return `última visita: ${dateStr}`;
    }
  };

  const formatNextVisit = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      return format(parseISO(dateStr), "dd/MM/yyyy");
    } catch {
      return dateStr;
    }
  };

  const formatDesignations = (m: MemberWithLastVisit) => {
    const parts: string[] = [];
    if (m.appointment === "anciao") parts.push("Ancião");
    if (m.appointment === "servo_ministerial") parts.push("Servo ministerial");

    if (m.service_status === "pioneiro_regular") parts.push("Pioneiro regular");
    else if (m.service_status === "pioneiro_auxiliar_continuo")
      parts.push("Pioneiro auxiliar contínuo");
    else if (m.service_status === "publicador_nao_batizado")
      parts.push("Não batizado");

    return parts.join(" · ");
  };

  const getGroupMemberBadges = (
    m: CongregationMember,
    isOverseer: boolean,
    isAssistant: boolean
  ) => {
    const badges: { text: string; variant: "overseer" | "assistant" | "role" }[] = [];

    if (isOverseer) {
      badges.push({ text: "Superintendente", variant: "overseer" });
    } else if (isAssistant) {
      badges.push({ text: "Ajudante", variant: "assistant" });
    }

    if (m.appointment === "anciao" && !isOverseer) {
      badges.push({ text: "Ancião", variant: "role" });
    } else if (m.appointment === "servo_ministerial" && !isAssistant) {
      badges.push({ text: "Servo ministerial", variant: "role" });
    }

    if (m.service_status === "pioneiro_regular") {
      badges.push({ text: "Pioneiro regular", variant: "role" });
    } else if (m.service_status === "pioneiro_auxiliar_continuo") {
      badges.push({ text: "Pioneiro aux.", variant: "role" });
    } else if (m.service_status === "publicador_nao_batizado") {
      badges.push({ text: "Não batizado", variant: "role" });
    }

    return badges;
  };

  const handleSelectMember = (m: MemberWithLastVisit) => {
    setSelectedMember(m);
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setMobileDetailOpen(true);
    }
  };

  const handleSelectMemberFromGroup = (m: CongregationMember) => {
    const fullMember = members.find((item) => item.id === m.id) || (m as MemberWithLastVisit);
    setSelectedMember(fullMember);
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setMobileDetailOpen(true);
    } else {
      router.push("/irmaos?view=publicadores");
    }
  };

  const handleMemberSaved = () => {
    fetchData();
  };

  const handleMemberDeleted = (deletedId: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== deletedId));
    if (selectedMember?.id === deletedId) {
      setSelectedMember(null);
    }
  };

  const handleGroupSaved = () => {
    fetchData();
  };

  const handleGroupDeleted = (deletedGroupId: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== deletedGroupId));
    setMembers((prev) =>
      prev.map((m) => (m.group_id === deletedGroupId ? { ...m, group_id: null } : m))
    );
  };

  const handleMembersAdded = () => {
    fetchData();
  };

  const handleMemberTransferred = () => {
    fetchData();
  };

  const handleRemoveMemberFromGroup = async (m: CongregationMember) => {
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from("congregation_members")
        .update({
          group_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", m.id);

      if (error) throw error;
      toast.success("Publicador removido do grupo (agora em Sem grupo)");
      setMembers((prev) =>
        prev.map((item) => (item.id === m.id ? { ...item, group_id: null } : item))
      );
    } catch (err) {
      console.error(err);
      toast.error("Erro ao remover publicador do grupo");
    }
  };

  const handleVisitSaved = () => {
    fetchData();
  };

  const handleDeleteVisit = async (visitId: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("shepherding_visits")
      .delete()
      .eq("id", visitId);

    if (error) {
      toast.error("Erro ao excluir visita");
      throw error;
    }

    toast.success("Visita excluída com sucesso");
    setDetailVisit(null);
    fetchData();
  };

  if (isUnlocked === null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isUnlocked === false) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <AppHeader title="Congregação" backHref="/congregacao" />
        <PastoreioLockGate onUnlock={() => setIsUnlocked(true)} />
      </div>
    );
  }

  const selectedMemberAssignedGroup = selectedMember?.group_id
    ? groups.find((g) => g.id === selectedMember.group_id) || null
    : null;

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28 lg:pb-12">
      <AppHeader
        title={isGruposView ? "Grupos de Serviço de Campo" : "Todos os publicadores"}
        subtitle={
          isGruposView
            ? "Superintendentes, ajudantes e alocação de publicadores"
            : "Lista confidencial de publicadores e pioneiros da congregação"
        }
        backHref="/congregacao"
        right={
          canManageMembers ? (
            isGruposView ? (
              <Button
                variant="primary"
                size="sm"
                className="rounded-full px-4 h-9 shadow-xs"
                onClick={() => {
                  setEditingGroup(null);
                  setGroupFormOpen(true);
                }}
              >
                <Plus size={16} className="mr-1.5" />
                Novo grupo
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                className="rounded-full px-4 h-9 shadow-xs"
                onClick={() => {
                  setEditingMember(null);
                  setMemberFormOpen(true);
                }}
              >
                <Plus size={16} className="mr-1.5" />
                Novo publicador
              </Button>
            )
          ) : null
        }
      />

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 1. VISÃO: GRUPOS DE SERVIÇO DE CAMPO (isGruposView === true)         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {isGruposView ? (
        loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-[var(--ink-muted)]">
            <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
            <span className="text-body-sm">Carregando grupos de serviço...</span>
          </div>
        ) : groups.length === 0 ? (
          <Card className="py-12 rounded-[28px] bg-[var(--panel)]">
            <EmptyState
              title="Nenhum grupo de serviço"
              description="Cadastre os grupos de serviço de campo da congregação para alocar os publicadores."
              action={
                canManageMembers ? (
                  <Button
                    onClick={() => {
                      setEditingGroup(null);
                      setGroupFormOpen(true);
                    }}
                  >
                    <Plus size={16} className="mr-1" />
                    Criar primeiro grupo
                  </Button>
                ) : undefined
              }
            />
          </Card>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Grid Amplo: Máximo de 2 Colunas no Desktop (Sem 3 Colunas!) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {groups.map((group) => {
                const groupMembers = groupMembersMap.get(group.id) || [];
                const totalPublicadores = groupMembers.length;
                const totalAnciaos = groupMembers.filter((m) => m.appointment === "anciao").length;
                const totalServos = groupMembers.filter((m) => m.appointment === "servo_ministerial").length;
                const totalPioneiros = groupMembers.filter(
                  (m) =>
                    m.service_status === "pioneiro_regular" ||
                    m.service_status === "pioneiro_auxiliar_continuo"
                ).length;

                const overseerMember = groupMembers.find((m) => m.id === group.overseer_id);
                const assistantMember = groupMembers.find((m) => m.id === group.assistant_id);

                return (
                  <Card
                    key={group.id}
                    className="p-6 sm:p-7 flex flex-col gap-4 rounded-[28px] bg-[var(--panel)] border border-[var(--border)]/60 shadow-xs"
                  >
                    {/* Topo do Grupo: Título sem truncate + Ações à direita */}
                    <div className="flex flex-col gap-2 pb-3.5 border-b border-[var(--border)]/70">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-col min-w-0">
                          <h3 className="font-display font-medium text-xl sm:text-2xl text-[var(--ink)] leading-snug break-words">
                            {group.sort_order}. {group.name}
                          </h3>
                          <p className="text-sm text-[var(--ink-muted)] flex items-center gap-1.5 mt-1 whitespace-nowrap">
                            <Clock size={14} className="shrink-0 text-[var(--primary)]" />
                            <span>
                              {group.meeting_info
                                ? (group.meeting_info.toLowerCase().includes("consideração")
                                    ? group.meeting_info
                                    : `Consideração do campo às ${group.meeting_info}`)
                                : "Horário não informado"}
                            </span>
                          </p>
                        </div>

                        {canManageMembers && (
                          <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setAddMembersGroup(group)}
                              className="h-8 px-3 text-xs rounded-full font-medium"
                            >
                              <UserPlus size={13} className="mr-1.5" />
                              Adicionar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingGroup(group);
                                setGroupFormOpen(true);
                              }}
                              className="h-8 w-8 p-0 rounded-full text-xs hover:bg-[var(--surface)] text-[var(--ink-muted)] hover:text-[var(--ink)]"
                              title="Editar grupo"
                            >
                              <Pencil size={13} />
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Destaque para Superintendente e Ajudante (Nomes completos sem truncate!) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-2">
                        <div className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)]/60 flex flex-col gap-1">
                          <span className="text-[10px] uppercase font-semibold text-[var(--primary)] tracking-wider">
                            Superintendente
                          </span>
                          <span className="text-sm font-medium text-[var(--ink)] break-words">
                            {overseerMember ? overseerMember.full_name : "Não designado"}
                          </span>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)]/60 flex flex-col gap-1">
                          <span className="text-[10px] uppercase font-semibold text-[var(--accent)] tracking-wider">
                            Ajudante
                          </span>
                          <span className="text-sm font-medium text-[var(--ink)] break-words">
                            {assistantMember ? assistantMember.full_name : "Não designado"}
                          </span>
                        </div>
                      </div>

                      {/* Contadores do Grupo */}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--ink-muted)] pt-0.5">
                        <span className="font-semibold text-[var(--ink)]">
                          {totalPublicadores} {totalPublicadores === 1 ? "Publicador" : "Publicadores"}
                        </span>
                        <span>•</span>
                        <span>{totalAnciaos} {totalAnciaos === 1 ? "Ancião" : "Anciãos"}</span>
                        <span>•</span>
                        <span>{totalServos} {totalServos === 1 ? "Servo" : "Servos"}</span>
                        <span>•</span>
                        <span>{totalPioneiros} {totalPioneiros === 1 ? "Pioneiro" : "Pioneiros"}</span>
                      </div>
                    </div>

                    {/* Lista de Publicadores do Grupo (Sem rolagem interna, cresce naturalmente!) */}
                    {groupMembers.length === 0 ? (
                      <div className="py-6 text-center text-caption text-[var(--ink-muted)] italic">
                        Nenhum publicador alocado neste grupo ainda.
                      </div>
                    ) : (
                      <div className="flex flex-col divide-y divide-[var(--border)]/40 -mx-1 pt-1">
                        {groupMembers.map((m, index) => {
                          const isSelf = isCurrentUserMember(m, { memberId, userId });
                          const isOverseer = m.id === group.overseer_id;
                          const isAssistant = m.id === group.assistant_id;
                          const badges = getGroupMemberBadges(m, isOverseer, isAssistant);

                          return (
                            <div
                              key={m.id}
                              className="py-2.5 px-3 rounded-xl hover:bg-[var(--surface)] transition-colors flex items-center justify-between gap-3 group"
                            >
                              <div
                                onClick={() => handleSelectMemberFromGroup(m)}
                                className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                              >
                                <span className="text-2xs font-mono font-semibold text-[var(--ink-muted)] w-5 text-right shrink-0">
                                  {index + 1}.
                                </span>
                                <div className="flex items-center gap-2 flex-wrap min-w-0">
                                  <span className="text-sm font-medium text-[var(--ink)] group-hover:text-[var(--primary)] transition-colors whitespace-nowrap">
                                    {m.full_name}
                                  </span>
                                  {isSelf && (
                                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-[var(--primary)] text-white">
                                      Você
                                    </span>
                                  )}
                                  {badges.length > 0 && (
                                    <div className="flex items-center gap-1 flex-wrap">
                                      {badges.map((b, i) => (
                                        <span
                                          key={i}
                                          className={cn(
                                            "text-[10px] px-2 py-0.2 rounded-full border leading-tight whitespace-nowrap",
                                            b.variant === "overseer"
                                              ? "bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/25 font-semibold"
                                              : b.variant === "assistant"
                                              ? "bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/30 font-semibold"
                                              : "bg-[var(--background)] text-[var(--ink-muted)] border-[var(--border)]"
                                          )}
                                        >
                                          {b.text}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Ações Rápidas: discretas no desktop no hover */}
                              <div className="flex items-center gap-0.5 shrink-0 transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
                                {canManageMembers && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => setTransferMember(m)}
                                      className="p-1.5 rounded-lg hover:bg-[var(--background)] text-[var(--ink-muted)] hover:text-[var(--primary)] transition-colors cursor-pointer"
                                      title="Transferir de grupo"
                                      aria-label="Transferir de grupo"
                                    >
                                      <ArrowRightLeft size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveMemberFromGroup(m)}
                                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--ink-muted)] hover:text-red-500 transition-colors cursor-pointer"
                                      title="Remover do grupo"
                                      aria-label="Remover do grupo"
                                    >
                                      <UserMinus size={14} />
                                    </button>
                                  </>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleSelectMemberFromGroup(m)}
                                  className="p-1.5 rounded-lg hover:bg-[var(--background)] text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
                                  title="Ver detalhes"
                                  aria-label="Ver detalhes"
                                >
                                  <ChevronRight size={15} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>

            {/* Bloco "Publicadores sem grupo" */}
            <Card className="p-6 sm:p-7 flex flex-col gap-4 rounded-[28px] border-dashed border-[var(--border)] bg-[var(--background)]/40 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]/70">
                <div>
                  <h3 className="font-display font-medium text-lg sm:text-xl text-[var(--ink)]">
                    Publicadores sem grupo ({unassignedMembers.length})
                  </h3>
                  <p className="text-xs text-[var(--ink-muted)] mt-0.5">
                    Publicadores ativos que ainda não foram alocados em nenhum grupo de serviço de campo.
                  </p>
                </div>
              </div>

              {unassignedMembers.length === 0 ? (
                <div className="py-6 text-center text-caption text-[var(--ink-muted)] italic">
                  Todos os publicadores ativos já estão alocados em seus respectivos grupos.
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-[var(--border)]/40 -mx-1">
                  {unassignedMembers.map((m, index) => {
                    const badges = getGroupMemberBadges(m, false, false);

                    return (
                      <div
                        key={m.id}
                        className="py-2.5 px-3 flex items-center justify-between gap-3 hover:bg-[var(--surface)] rounded-xl transition-colors"
                      >
                        <div
                          onClick={() => handleSelectMemberFromGroup(m)}
                          className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                        >
                          <span className="text-2xs font-mono font-semibold text-[var(--ink-muted)] w-5 text-right shrink-0">
                            {index + 1}.
                          </span>
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <span className="text-sm font-medium text-[var(--ink)] hover:text-[var(--primary)] transition-colors whitespace-nowrap">
                              {m.full_name}
                            </span>
                            {badges.length > 0 && (
                              <div className="flex items-center gap-1 flex-wrap">
                                {badges.map((b, i) => (
                                  <span
                                    key={i}
                                    className="text-[10px] px-2 py-0.2 rounded-full border bg-[var(--background)] text-[var(--ink-muted)] border-[var(--border)]"
                                  >
                                    {b.text}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {canManageMembers && (
                          <div className="shrink-0 flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setTransferMember(m)}
                              className="h-8 px-3 text-xs rounded-full font-medium"
                            >
                              <UserCheck size={13} className="mr-1.5" />
                              Alocar em grupo
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        )
      ) : (
        /* ═══════════════════════════════════════════════════════════════════ */
        /* 2. VISÃO: TODOS OS PUBLICADORES (!isGruposView)                      */
        /* ═══════════════════════════════════════════════════════════════════ */
        <div className="flex flex-col gap-6">
          {/* Barra de Ferramentas Horizontal Unificada */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="relative flex-1 min-w-[220px]">
                <Search
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] pointer-events-none"
                />
                <Input
                  type="text"
                  placeholder="Buscar publicador por nome..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9 pr-9 h-10 text-xs sm:text-sm rounded-full bg-[var(--surface)] border-[var(--border)]/70"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer"
                    aria-label="Limpar busca"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {groups.length > 0 && (
                <div className="w-[190px] shrink-0">
                  <Select
                    value={groupFilter}
                    onChange={(e) => setGroupFilter(e.target.value)}
                    className="h-10 text-xs rounded-full bg-[var(--surface)] border-[var(--border)]/70"
                    options={[
                      { value: "todos", label: "Todos os grupos" },
                      { value: "sem_grupo", label: "Publicadores sem grupo" },
                      ...groups.map((g) => ({
                        value: g.id,
                        label: `${g.sort_order}. ${g.name}`,
                      })),
                    ]}
                  />
                </div>
              )}

              <button
                type="button"
                onClick={() =>
                  setSortBy((cur) =>
                    cur === "nome" ? "tempo_sem_visita" : "nome"
                  )
                }
                className={cn(
                  "h-10 px-3.5 rounded-full border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0",
                  sortBy === "tempo_sem_visita"
                    ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-2xs"
                    : "bg-[var(--surface)] text-[var(--ink)] border-[var(--border)] hover:bg-[var(--background)]"
                )}
                title="Alternar critério de ordenação"
              >
                <ArrowUpDown size={13} />
                <span>{sortBy === "tempo_sem_visita" ? "Sem visita" : "A–Z"}</span>
              </button>
            </div>

            {/* Pílulas de filtro horizontais com contagem */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {[
                { id: "todos", label: "Todos", count: counts.todos },
                ...(canUseShepherding
                  ? [{ id: "na_hora", label: "Na hora de visitar", count: counts.na_hora }]
                  : []),
                { id: "anciaos", label: "Anciãos", count: counts.anciaos },
                { id: "servos", label: "Servos ministeriais", count: counts.servos },
                { id: "pioneiros", label: "Pioneiros", count: counts.pioneiros },
                { id: "publicadores", label: "Publicadores", count: counts.publicadores },
                { id: "nao_batizados", label: "Não batizados", count: counts.nao_batizados },
                { id: "arquivados", label: "Arquivados", count: counts.arquivados },
              ].map((chip) => {
                const isActive = filter === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setFilter(chip.id as FilterType)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5",
                      isActive
                        ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-2xs"
                        : "bg-[var(--surface)] text-[var(--ink-muted)] hover:text-[var(--ink)] border-[var(--border)]"
                    )}
                  >
                    <span>{chip.label}</span>
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.2 rounded-full",
                        isActive
                          ? "bg-white/20 text-white font-semibold"
                          : "bg-[var(--background)] text-[var(--ink-muted)]"
                      )}
                    >
                      {chip.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conteúdo: Estado de Loading ou Vazio */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-[var(--ink-muted)]">
              <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
              <span className="text-body-sm">Carregando publicadores...</span>
            </div>
          ) : members.length === 0 ? (
            <Card className="py-12 rounded-[28px] bg-[var(--panel)]">
              <EmptyState
                title="Nenhum publicador cadastrado"
                description="Cadastre os publicadores e pioneiros da congregação para vincular aos grupos e pastoreio."
                action={
                  canManageMembers ? (
                    <Button onClick={() => setMemberFormOpen(true)}>
                      <Plus size={16} className="mr-1" />
                      Cadastrar primeiro publicador
                    </Button>
                  ) : undefined
                }
              />
            </Card>
          ) : filteredAndSortedMembers.length === 0 ? (
            <Card className="py-10 rounded-[28px] bg-[var(--panel)]">
              <EmptyState
                title="Nenhum publicador encontrado"
                description={`Nenhum registro para o filtro atual${query ? ` e busca "${query}"` : ""}.`}
                action={
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setFilter("todos");
                      setGroupFilter("todos");
                      setQuery("");
                    }}
                  >
                    Limpar filtros
                  </Button>
                }
              />
            </Card>
          ) : (
            <>
              {/* ── DESKTOP: SPLIT VIEW (TABELA AMPLA + PAINEL FIXO DE DETALHES) ── */}
              <div className="hidden lg:grid lg:grid-cols-12 lg:gap-8 items-start">
                {/* Coluna da Esquerda: Tabela Editorial Limpa */}
                <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-2">
                  <div className="flex items-center justify-between px-1 text-xs text-[var(--ink-muted)]">
                    <span className="font-semibold uppercase tracking-wider text-[11px]">
                      {filter === "arquivados"
                        ? "Arquivados"
                        : filter === "na_hora"
                        ? "Na hora de visitar"
                        : "Publicadores"}{" "}
                      ({filteredAndSortedMembers.length})
                    </span>
                    <span>
                      {sortBy === "tempo_sem_visita" ? "Ordenado por tempo sem visita" : "Ordem alfabética"}
                    </span>
                  </div>

                  <div className="overflow-hidden rounded-[24px] border border-[var(--border)]/70 bg-[var(--surface)] shadow-xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--border)]/70 bg-[var(--panel)] text-[var(--ink-muted)] uppercase text-[10px] tracking-wider font-semibold select-none">
                          <th className="py-3 px-4">Nome do Publicador</th>
                          <th className="py-3 px-4">Designação / Privilégio</th>
                          <th className="py-3 px-4">Grupo de Serviço</th>
                          <th className="py-3 px-4">Status Pastoral</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]/50">
                        {filteredAndSortedMembers.map((m) => {
                          const isSelf = isCurrentUserMember(m, { memberId, userId });
                          const isSelected = selectedMember?.id === m.id;
                          const initial = m.full_name ? m.full_name.charAt(0).toUpperCase() : "?";
                          const assignedGroup = m.group_id
                            ? groups.find((g) => g.id === m.group_id)
                            : null;
                          const designations = formatDesignations(m);
                          const isDue = !!(!isSelf && m.next_visit_date && m.next_visit_date <= today);

                          return (
                            <tr
                              key={m.id}
                              onClick={() => setSelectedMember(m)}
                              className={cn(
                                "transition-colors cursor-pointer select-none",
                                isSelected
                                  ? "bg-[var(--panel)] font-medium text-[var(--ink)] shadow-2xs"
                                  : "hover:bg-[var(--background)]/60 text-[var(--ink)]"
                              )}
                            >
                              {/* Nome + Avatar */}
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2.5">
                                  <div
                                    className={cn(
                                      "w-8 h-8 rounded-full flex items-center justify-center font-display font-semibold text-xs shrink-0 transition-colors",
                                      isSelected
                                        ? "bg-[var(--primary)] text-white shadow-xs"
                                        : "bg-[var(--primary)]/10 text-[var(--primary)]"
                                    )}
                                  >
                                    {initial}
                                  </div>
                                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                    <span className="font-medium text-xs sm:text-sm truncate">
                                      {m.full_name}
                                    </span>
                                    {isSelf && (
                                      <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-[var(--primary)] text-white">
                                        Você
                                      </span>
                                    )}
                                    {!m.active && (
                                      <span className="text-[9px] font-medium px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400">
                                        Arquivado
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Designação */}
                              <td className="py-3.5 px-4 text-[var(--ink-muted)]">
                                {designations || "Publicador"}
                              </td>

                              {/* Grupo de Serviço */}
                              <td className="py-3.5 px-4">
                                <span
                                  className={cn(
                                    "text-[11px] px-2.5 py-0.5 rounded-full border whitespace-nowrap",
                                    assignedGroup
                                      ? "bg-[var(--surface)] text-[var(--ink)] border-[var(--border)]"
                                      : "bg-[var(--background)] text-[var(--ink-muted)] border-dashed border-[var(--border)]"
                                  )}
                                >
                                  {assignedGroup ? `${assignedGroup.sort_order}. ${assignedGroup.name}` : "Sem grupo"}
                                </span>
                              </td>

                              {/* Status Pastoral */}
                              <td className="py-3.5 px-4">
                                {isSelf ? (
                                  <span className="text-2xs text-[var(--ink-muted)]">—</span>
                                ) : isDue ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30">
                                    Na hora de visitar
                                  </span>
                                ) : m.last_visit_date ? (
                                  <span className="text-2xs text-[var(--ink-muted)]">
                                    {formatDistanceToNow(parseISO(m.last_visit_date), {
                                      locale: ptBR,
                                      addSuffix: true,
                                    })}
                                  </span>
                                ) : (
                                  <span className="text-2xs text-amber-600 dark:text-amber-400 font-medium">
                                    Sem visita
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Coluna da Direita: Painel Fixo de Detalhes e Edição */}
                <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-6">
                  <MemberDetailPanel
                    member={selectedMember}
                    assignedGroup={selectedMemberAssignedGroup}
                    isSelf={
                      selectedMember
                        ? isCurrentUserMember(selectedMember, { memberId, userId })
                        : false
                    }
                    canManageMembers={canManageMembers}
                    canUseShepherding={canUseShepherding}
                    isElderOrAdmin={isElderOrAdmin}
                    onEdit={(m) => {
                      setEditingMember(m);
                      setMemberFormOpen(true);
                    }}
                    onNewVisit={(m) => {
                      setPreselectedMemberId(m.id);
                      setEditingVisit(null);
                      setVisitFormOpen(true);
                    }}
                    onSelectVisit={(v) => {
                      setDetailVisit(v);
                    }}
                    onTransfer={(m) => {
                      setTransferMember(m);
                    }}
                  />
                </div>
              </div>

              {/* ── MOBILE: LISTA DE CARTÕES (< 1024px) ── */}
              <div className="lg:hidden flex flex-col gap-2.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-caption font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                    {filter === "arquivados"
                      ? "Arquivados"
                      : filter === "na_hora"
                      ? "Na hora de visitar"
                      : "Publicadores"}{" "}
                    ({filteredAndSortedMembers.length})
                  </span>
                  <span className="text-caption text-[var(--ink-muted)]">
                    {sortBy === "tempo_sem_visita" ? "Ordenado por tempo sem visita" : "Ordem alfabética"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredAndSortedMembers.map((m) => {
                    const isSelf = isCurrentUserMember(m, { memberId, userId });
                    const designations = formatDesignations(m);
                    const lastVisitText = formatLastVisit(m.last_visit_date);
                    const hasNoVisit = !m.last_visit_date;

                    const nextVisitFormatted = formatNextVisit(m.next_visit_date);
                    const isDue = !!(m.next_visit_date && m.next_visit_date <= today);

                    const assignedGroup = m.group_id
                      ? groups.find((g) => g.id === m.group_id)
                      : null;

                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleSelectMember(m)}
                        className="w-full text-left bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 hover:border-[var(--primary)]/50 active:bg-[var(--background)] transition-all shadow-xs flex items-center justify-between gap-3 group cursor-pointer"
                      >
                        <div className="flex flex-col gap-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-display font-medium text-base text-[var(--ink)] truncate group-hover:text-[var(--primary)] transition-colors">
                              {m.full_name}
                            </span>
                            {isSelf && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.2 rounded-full bg-[var(--primary)] text-white">
                                Você
                              </span>
                            )}
                            {!m.active && (
                              <span className="text-[10px] font-medium px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400">
                                Arquivado
                              </span>
                            )}
                            <span
                              className={cn(
                                "text-2xs px-2 py-0.5 rounded-full border",
                                assignedGroup
                                  ? "bg-[var(--surface)] text-[var(--ink-muted)] border-[var(--border)]"
                                  : "bg-[var(--background)] text-[var(--ink-muted)]/70 border-dashed border-[var(--border)]"
                              )}
                            >
                              {assignedGroup ? `${assignedGroup.sort_order}. ${assignedGroup.name}` : "Sem grupo"}
                            </span>
                          </div>

                          {designations && (
                            <span className="text-caption text-[var(--ink-muted)] truncate">
                              {designations}
                            </span>
                          )}

                          {!isSelf && canUseShepherding && (
                            <div className="flex flex-col gap-0.5 mt-0.5">
                              <div className="flex items-center gap-1.5 text-2xs">
                                <Clock
                                  size={11}
                                  className={hasNoVisit ? "text-amber-500" : "text-[var(--ink-muted)]"}
                                />
                                <span
                                  className={
                                    hasNoVisit
                                      ? "text-amber-700 dark:text-amber-400 font-medium"
                                      : "text-[var(--ink-muted)]"
                                  }
                                >
                                  {lastVisitText}
                                </span>
                              </div>

                              {nextVisitFormatted && (
                                <div className="flex items-center gap-1.5 text-2xs">
                                  <CalendarClock
                                    size={11}
                                    className={isDue ? "text-[var(--accent)]" : "text-[var(--ink-muted)]"}
                                  />
                                  {isDue ? (
                                    <span className="text-[var(--accent)] font-semibold flex items-center gap-1">
                                      <span>próxima: {nextVisitFormatted}</span>
                                      <span>·</span>
                                      <span className="font-bold">na hora de visitar</span>
                                    </span>
                                  ) : (
                                    <span className="text-[var(--ink-muted)]">
                                      próxima: {nextVisitFormatted}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <ChevronRight
                          size={18}
                          className="text-[var(--ink-muted)] group-hover:text-[var(--primary)] shrink-0 transition-transform group-hover:translate-x-0.5"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── SHEET DE CADASTRO / EDIÇÃO DE PUBLICADOR ── */}
      <MemberFormSheet
        open={memberFormOpen}
        onClose={() => {
          setMemberFormOpen(false);
          setEditingMember(null);
        }}
        userId={userId}
        initialData={editingMember}
        groups={groups}
        onSaved={handleMemberSaved}
        onDeleted={handleMemberDeleted}
      />

      {/* ── SHEET DE CADASTRO / EDIÇÃO DE GRUPO DE SERVIÇO ── */}
      <ServiceGroupFormSheet
        open={groupFormOpen}
        onClose={() => {
          setGroupFormOpen(false);
          setEditingGroup(null);
        }}
        userId={userId}
        initialData={editingGroup}
        members={members}
        defaultSortOrder={groups.length + 1}
        onSaved={handleGroupSaved}
        onDeleted={handleGroupDeleted}
      />

      {/* ── SHEET PARA ADICIONAR IRMÃOS AO GRUPO ── */}
      <AddMembersToGroupSheet
        open={!!addMembersGroup}
        onClose={() => setAddMembersGroup(null)}
        group={addMembersGroup}
        members={members}
        groups={groups}
        onSaved={handleMembersAdded}
      />

      {/* ── DIALOG DE TRANSFERÊNCIA / ALOCAÇÃO RÁPIDA DE GRUPO ── */}
      <TransferMemberDialog
        open={!!transferMember}
        onClose={() => setTransferMember(null)}
        member={transferMember}
        groups={groups}
        onTransferred={handleMemberTransferred}
      />

      {/* ── SHEET DE DETALHES DO PUBLICADOR (DRAWER NO MOBILE) ── */}
      <MemberDetailSheet
        member={selectedMember}
        open={mobileDetailOpen && !!selectedMember}
        onClose={() => {
          setMobileDetailOpen(false);
        }}
        canManageMembers={canManageMembers}
        canUseShepherding={canUseShepherding}
        isCurrentUser={
          selectedMember
            ? isCurrentUserMember(selectedMember, { memberId, userId })
            : false
        }
        onEdit={(m) => {
          setMobileDetailOpen(false);
          setEditingMember(m);
          setMemberFormOpen(true);
        }}
        onNewVisit={(m) => {
          setMobileDetailOpen(false);
          setPreselectedMemberId(m.id);
          setEditingVisit(null);
          setVisitFormOpen(true);
        }}
        onSelectVisit={(v) => {
          setDetailVisit(v);
        }}
      />

      {/* ── FORMULÁRIO DE NOVA VISITA / EDIÇÃO VINCULADO AO PUBLICADOR ── */}
      <PastoreioFormSheet
        open={visitFormOpen}
        onClose={() => {
          setVisitFormOpen(false);
          setPreselectedMemberId(null);
          setEditingVisit(null);
        }}
        userId={userId}
        initialData={editingVisit}
        preselectedMemberId={preselectedMemberId}
        onSaved={handleVisitSaved}
      />

      {/* ── DRAWER DE DETALHES DA VISITA (AO TOCAR NUMA VISITA DO HISTÓRICO) ── */}
      <PastoreioDetailSheet
        visit={detailVisit}
        open={!!detailVisit}
        visitedNames={detailVisitedNames}
        linkedCompanionName={
          detailVisit?.companion_member_id
            ? members.find((m) => m.id === detailVisit.companion_member_id)?.full_name || null
            : null
        }
        currentUserId={userId}
        onClose={() => setDetailVisit(null)}
        onEdit={(v) => {
          setEditingVisit(v);
          setVisitFormOpen(true);
        }}
        onDelete={handleDeleteVisit}
      />
    </div>
  );
}
