"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  Sparkles,
  Home,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import { PastoreioLockGate } from "@/components/pastoreio/pastoreio-lock-gate";
import { PastoreioDetailSheet } from "@/components/pastoreio/pastoreio-detail-sheet";
import { PastoreioFormSheet } from "@/components/pastoreio/pastoreio-form-sheet";
import { MemberFormSheet } from "@/components/irmaos/member-form-sheet";
import { MemberDetailSheet } from "@/components/irmaos/member-detail-sheet";
import { ServiceGroupFormSheet } from "@/components/irmaos/service-group-form-sheet";
import { AddMembersToGroupSheet } from "@/components/irmaos/add-members-to-group-sheet";
import { TransferMemberDialog } from "@/components/irmaos/transfer-member-dialog";
import type {
  CongregationMember,
  MemberWithLastVisit,
  ServiceGroup,
} from "@/lib/types/congregation";
import type { ShepherdingVisit } from "@/lib/types/pastoreio";

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
  const searchParams = useSearchParams();
  const initialTab = searchParams?.get("tab") === "grupos" ? "grupos" : "todos";
  const initialFilterParam = searchParams?.get("filter");
  const initialFilter: FilterType =
    initialFilterParam === "na_hora" || initialFilterParam === "due"
      ? "na_hora"
      : "todos";

  const { canManageMembers, canUseShepherding, memberId } = useUserPermissions();

  const [isUnlocked, setIsUnlocked] = useState<boolean | null>(null);
  const [members, setMembers] = useState<MemberWithLastVisit[]>([]);
  const [groups, setGroups] = useState<ServiceGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // Alternância de visão: "todos" ou "grupos"
  const [activeTab, setActiveTab] = useState<"todos" | "grupos">(initialTab);

  // Filtros e busca para "Todos os irmãos"
  const [filter, setFilter] = useState<FilterType>(initialFilter);
  const [groupFilter, setGroupFilter] = useState<string>("todos");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortByType>("nome");

  // Painéis de Irmãos
  const [memberFormOpen, setMemberFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<CongregationMember | null>(null);
  const [selectedMember, setSelectedMember] = useState<MemberWithLastVisit | null>(null);

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
        toast.error("Erro ao carregar lista de irmãos");
        return;
      }

      if (groupsRes.data) {
        setGroups(groupsRes.data as ServiceGroup[]);
      }

      // Mapa da visita mais recente para cada member_id
      interface MemberVisitSummary {
        last_visit_date: string | null;
        last_visit_companion: string | null;
        next_visit_date: string | null;
        created_at: string | null;
      }

      const lastVisitMap = new Map<string, MemberVisitSummary>();

      for (const row of (visitMembersRes.data || []) as any[]) {
        const memberId = row.member_id;
        const v = row.visit;
        if (!memberId || !v || !v.visit_date) continue;

        const existing = lastVisitMap.get(memberId);
        if (!existing) {
          lastVisitMap.set(memberId, {
            last_visit_date: v.visit_date,
            last_visit_companion: v.companion || null,
            next_visit_date: v.next_visit_date || null,
            created_at: v.created_at || null,
          });
        } else {
          const isNewer =
            v.visit_date > (existing.last_visit_date || "") ||
            (v.visit_date === existing.last_visit_date &&
              (v.created_at || "") > (existing.created_at || ""));

          if (isNewer) {
            lastVisitMap.set(memberId, {
              last_visit_date: v.visit_date,
              last_visit_companion: v.companion || null,
              next_visit_date: v.next_visit_date || null,
              created_at: v.created_at || null,
            });
          }
        }
      }

      const merged: MemberWithLastVisit[] = (
        (membersRes.data || []) as CongregationMember[]
      ).map((m) => {
        const last = lastVisitMap.get(m.id);
        return {
          ...m,
          last_visit_date: last?.last_visit_date || null,
          last_visit_companion: last?.last_visit_companion || null,
          next_visit_date: last?.next_visit_date || null,
        };
      });

      setMembers(merged);
    } catch (err) {
      console.error(err);
      toast.error("Erro de conexão");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isUnlocked) {
      fetchData();
    }
  }, [isUnlocked, fetchData]);

  // Load visited names for detail visit sheet when opened
  useEffect(() => {
    if (!detailVisit) {
      setDetailVisitedNames([]);
      return;
    }

    let isMounted = true;
    const loadVisitMembers = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("shepherding_visit_members")
          .select("member_id")
          .eq("visit_id", detailVisit.id);

        if (isMounted) {
          const memberNames = (data || [])
            .map((row: any) => members.find((m) => m.id === row.member_id)?.full_name)
            .filter(Boolean) as string[];

          const others = detailVisit.other_people || [];
          const combined = [...memberNames, ...others];
          if (combined.length > 0) {
            setDetailVisitedNames(combined);
          } else {
            setDetailVisitedNames(
              detailVisit.family_or_person ? [detailVisit.family_or_person] : []
            );
          }
        }
      } catch {
        if (isMounted) {
          setDetailVisitedNames(
            detailVisit.family_or_person ? [detailVisit.family_or_person] : []
          );
        }
      }
    };

    loadVisitMembers();

    return () => {
      isMounted = false;
    };
  }, [detailVisit, members]);

  // Contagens para os chips de filtro na visão "Todos os irmãos"
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

  // Lista filtrada e ordenada de "Todos os irmãos"
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

  // Mapa de membros por grupo (ordenados: 1º Superintendente, 2º Ajudante, depois A-Z)
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

  // Irmãos ativos sem grupo
  const unassignedMembers = useMemo(() => {
    return members
      .filter((m) => m.active && !m.group_id)
      .sort((a, b) => a.full_name.localeCompare(b.full_name, "pt-BR"));
  }, [members]);

  // Formata a data relativa da última visita
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

  // Formata a data da próxima visita
  const formatNextVisit = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      return format(parseISO(dateStr), "dd/MM/yyyy");
    } catch {
      return dateStr;
    }
  };

  // Monta texto das designações na lista geral
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

  // Badges específicas para a visão de Grupos de Serviço
  const getGroupMemberBadges = (
    m: CongregationMember,
    isOverseer: boolean,
    isAssistant: boolean
  ) => {
    const badges: { text: string; variant: "overseer" | "assistant" | "role" }[] = [];

    if (isOverseer) {
      badges.push({ text: "Superintendente de grupo", variant: "overseer" });
    } else if (isAssistant) {
      badges.push({ text: "Ajudante de grupo", variant: "assistant" });
    }

    if (m.appointment === "anciao") {
      badges.push({ text: "Ancião (A)", variant: "role" });
    } else if (m.appointment === "servo_ministerial") {
      badges.push({ text: "Servo ministerial (SM)", variant: "role" });
    }

    if (m.service_status === "pioneiro_regular") {
      badges.push({ text: "Pioneiro Regular (PR)", variant: "role" });
    } else if (m.service_status === "pioneiro_auxiliar_continuo") {
      badges.push({ text: "Pioneiro Auxiliar Contínuo (PAC)", variant: "role" });
    } else if (m.service_status === "publicador_nao_batizado") {
      badges.push({ text: "Publicador Não-Batizado (PNB)", variant: "role" });
    }

    return badges;
  };

  // Callback de membro salvo/atualizado
  const handleMemberSaved = (saved: CongregationMember) => {
    setMembers((prev) => {
      const idx = prev.findIndex((m) => m.id === saved.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          ...saved,
        };
        return updated;
      }
      return [
        {
          ...saved,
          last_visit_date: null,
          last_visit_companion: null,
          next_visit_date: null,
        },
        ...prev,
      ];
    });

    if (selectedMember && selectedMember.id === saved.id) {
      setSelectedMember((prev) => (prev ? { ...prev, ...saved } : null));
    }
  };

  // Callback de membro excluído
  const handleMemberDeleted = (deletedId: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== deletedId));
    if (selectedMember?.id === deletedId) {
      setSelectedMember(null);
    }
  };

  // Callback de grupo salvo/criado
  const handleGroupSaved = () => {
    fetchData();
  };

  // Callback de grupo excluído
  const handleGroupDeleted = (deletedGroupId: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== deletedGroupId));
    setMembers((prev) =>
      prev.map((m) => (m.group_id === deletedGroupId ? { ...m, group_id: null } : m))
    );
  };

  // Callback de irmãos adicionados a um grupo
  const handleMembersAdded = () => {
    fetchData();
  };

  // Callback de transferência rápida de membro
  const handleMemberTransferred = () => {
    fetchData();
  };

  // Remover membro do grupo (define group_id = null)
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
      toast.success("Irmão removido do grupo (agora em Sem grupo)");
      setMembers((prev) =>
        prev.map((item) => (item.id === m.id ? { ...item, group_id: null } : item))
      );
    } catch (err) {
      console.error(err);
      toast.error("Erro ao remover irmão do grupo");
    }
  };

  // Callback ao salvar nova visita
  const handleVisitSaved = () => {
    fetchData();
  };

  // Callback de exclusão de visita
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
        <AppHeader title="Irmãos" />
        <PastoreioLockGate onUnlock={() => setIsUnlocked(true)} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-8 max-w-xl mx-auto px-4 py-4">
      {/* Header */}
      <div>
        <Link
          href="/perfil"
          className="inline-flex items-center gap-1.5 text-body-sm text-[var(--ink-muted)] hover:text-[var(--ink)] mb-1 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Perfil</span>
        </Link>
        <AppHeader
          title="Irmãos"
          subtitle="Cadastro congregacional confidencial"
          right={
            canManageMembers ? (
              activeTab === "todos" ? (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingMember(null);
                    setMemberFormOpen(true);
                  }}
                >
                  <Plus size={16} className="mr-1" />
                  Novo irmão
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingGroup(null);
                    setGroupFormOpen(true);
                  }}
                >
                  <Plus size={16} className="mr-1" />
                  Novo grupo
                </Button>
              )
            ) : null
          }
        />
      </div>

      {/* ── ALTERNÂNCIA DE VISUALIZAÇÃO: ABAS ── */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "todos" | "grupos")}>
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="todos" className="flex items-center justify-center gap-1.5 cursor-pointer">
            <Users size={16} />
            <span>Todos os irmãos</span>
            <span className="text-2xs px-1.5 py-0.2 rounded-full bg-[var(--background)] text-[var(--ink-muted)] font-semibold">
              {counts.todos}
            </span>
          </TabsTrigger>
          <TabsTrigger value="grupos" className="flex items-center justify-center gap-1.5 cursor-pointer">
            <Home size={16} />
            <span>Grupos de Serviço</span>
            <span className="text-2xs px-1.5 py-0.2 rounded-full bg-[var(--background)] text-[var(--ink-muted)] font-semibold">
              {groups.length}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* ABA 1: TODOS OS IRMÃOS (LISTA GERAL + FILTRO POR GRUPO)            */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="todos" className="flex flex-col gap-3 mt-3">
          <div className="flex flex-col gap-2.5">
            {/* Linha 1: Busca e Ordenação */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] pointer-events-none"
                />
                <Input
                  type="text"
                  placeholder="Buscar por nome..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9 pr-9 h-10 text-body-sm"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer"
                    aria-label="Limpar busca"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Botão de Alternar Ordenação */}
              <button
                type="button"
                onClick={() =>
                  setSortBy((cur) =>
                    cur === "nome" ? "tempo_sem_visita" : "nome"
                  )
                }
                className={`h-10 px-3 rounded-md border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  sortBy === "tempo_sem_visita"
                    ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                    : "bg-[var(--surface)] text-[var(--ink)] border-[var(--border)] hover:bg-[var(--background)]"
                }`}
                title="Alternar critério de ordenação"
              >
                <ArrowUpDown size={14} />
                <span className="hidden xs:inline">
                  {sortBy === "tempo_sem_visita" ? "Sem visita" : "A–Z"}
                </span>
              </button>
            </div>

            {/* Linha 2: Filtro por Grupo de Serviço */}
            {groups.length > 0 && (
              <div className="flex items-center gap-2">
                <Select
                  value={groupFilter}
                  onChange={(e) => setGroupFilter(e.target.value)}
                  className="h-9 text-xs"
                  options={[
                    { value: "todos", label: "Todos os grupos de serviço" },
                    { value: "sem_grupo", label: "Irmãos sem grupo" },
                    ...groups.map((g) => ({
                      value: g.id,
                      label: `Grupo ${g.sort_order}: ${g.name}`,
                    })),
                  ]}
                />
                {groupFilter !== "todos" && (
                  <button
                    type="button"
                    onClick={() => setGroupFilter("todos")}
                    className="text-xs text-[var(--ink-muted)] hover:text-[var(--ink)] shrink-0 px-1 cursor-pointer"
                  >
                    Limpar
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Chips de filtro com contagem */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
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
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                    isActive
                      ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-2xs"
                      : "bg-[var(--surface)] text-[var(--ink-muted)] hover:text-[var(--ink)] border-[var(--border)]"
                  }`}
                >
                  <span>{chip.label}</span>
                  <span
                    className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                      isActive
                        ? "bg-white/20 text-white font-semibold"
                        : "bg-[var(--background)] text-[var(--ink-muted)]"
                    }`}
                  >
                    {chip.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Lista de irmãos */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-[var(--ink-muted)]">
              <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
              <span className="text-body-sm">Carregando congregação...</span>
            </div>
          ) : members.length === 0 ? (
            <Card className="py-10">
              <EmptyState
                title="Nenhum irmão cadastrado"
                description="Cadastre os publicadores e pioneiros da congregação para vincular ao pastoreio."
                action={
                  canManageMembers ? (
                    <Button onClick={() => setMemberFormOpen(true)}>
                      <Plus size={16} className="mr-1" />
                      Cadastrar primeiro irmão
                    </Button>
                  ) : undefined
                }
              />
            </Card>
          ) : filteredAndSortedMembers.length === 0 ? (
            <Card className="py-8">
              <EmptyState
                title="Nenhum irmão encontrado"
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
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-caption font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                  {filter === "arquivados"
                    ? "Arquivados"
                    : filter === "na_hora"
                    ? "Na hora de visitar"
                    : "Irmãos"}{" "}
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
                    onClick={() => setSelectedMember(m)}
                    className="w-full text-left bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3.5 hover:border-[var(--primary)]/50 active:bg-[var(--background)] transition-all shadow-xs flex items-center justify-between gap-3 group cursor-pointer"
                  >
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display font-semibold text-base text-[var(--ink)] truncate group-hover:text-[var(--primary)] transition-colors">
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
                        {/* Grupo a que pertence */}
                        <span
                          className={`text-2xs px-2 py-0.5 rounded-full border ${
                            assignedGroup
                              ? "bg-[var(--surface)] text-[var(--ink-muted)] border-[var(--border)]"
                              : "bg-[var(--background)] text-[var(--ink-muted)]/70 border-dashed border-[var(--border)]"
                          }`}
                        >
                          {assignedGroup ? `${assignedGroup.sort_order}. ${assignedGroup.name}` : "Sem grupo"}
                        </span>
                      </div>

                      {designations && (
                        <span className="text-caption text-[var(--ink-muted)] truncate">
                          {designations}
                        </span>
                      )}

                      {/* Linhas de visita: omitidas na linha própria do usuário ou se não tem shepherding_access */}
                      {!isSelf && canUseShepherding && (
                        <div className="flex flex-col gap-0.5 mt-0.5">
                          {/* Última visita */}
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

                          {/* Próxima visita */}
                          {nextVisitFormatted && (
                            <div className="flex items-center gap-1.5 text-2xs">
                              <CalendarClock
                                size={11}
                                className={isDue ? "text-[var(--accent)]" : "text-[var(--ink-muted)]"}
                              />
                              {isDue ? (
                                <span className="text-[var(--accent)] font-semibold flex items-center gap-1">
                                  <span>próxima visita: {nextVisitFormatted}</span>
                                  <span>·</span>
                                  <span className="font-bold">na hora de visitar</span>
                                </span>
                              ) : (
                                <span className="text-[var(--ink-muted)]">
                                  próxima visita: {nextVisitFormatted}
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
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* ABA 2: GRUPOS DE SERVIÇO DE CAMPO                                   */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="grupos" className="flex flex-col gap-4 mt-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-[var(--ink-muted)]">
              <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
              <span className="text-body-sm">Carregando grupos de serviço...</span>
            </div>
          ) : groups.length === 0 ? (
            <Card className="py-10">
              <EmptyState
                title="Nenhum grupo de serviço"
                description="Cadastre os grupos de serviço de campo da congregação para alocar os publicadores."
                action={
                  <Button
                    onClick={() => {
                      setEditingGroup(null);
                      setGroupFormOpen(true);
                    }}
                  >
                    <Plus size={16} className="mr-1" />
                    Criar primeiro grupo
                  </Button>
                }
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Grupos de serviço ordenados por sort_order */}
              {groups.map((group) => {
                const groupMembers = groupMembersMap.get(group.id) || [];

                // Resumo automático em tempo real:
                // X Publicadores | Y Anciãos | Z Servos ministeriais | W Pioneiros
                const totalPublicadores = groupMembers.length;
                const totalAnciaos = groupMembers.filter((m) => m.appointment === "anciao").length;
                const totalServos = groupMembers.filter((m) => m.appointment === "servo_ministerial").length;
                const totalPioneiros = groupMembers.filter(
                  (m) =>
                    m.service_status === "pioneiro_regular" ||
                    m.service_status === "pioneiro_auxiliar_continuo"
                ).length;

                return (
                  <Card key={group.id} className="p-5 sm:p-6 flex flex-col gap-3.5 rounded-[28px] bg-[var(--panel)] border-0 shadow-xs">
                    {/* Cabeçalho do Grupo */}
                    <div className="flex flex-col gap-1.5 pb-2.5 border-b border-[var(--border)]/70">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col min-w-0">
                          <h3 className="font-display font-semibold text-base text-[var(--ink)] truncate">
                            {group.sort_order}. {group.name}
                          </h3>
                          {group.meeting_info && (
                            <p className="text-caption text-[var(--ink-muted)] flex items-center gap-1.5 mt-0.5">
                              <Clock size={12} className="shrink-0 text-[var(--primary)]" />
                              <span>{group.meeting_info}</span>
                            </p>
                          )}
                        </div>

                        {/* Botões do Cabeçalho */}
                        {canManageMembers && (
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setAddMembersGroup(group)}
                              className="h-8 px-2.5 text-xs"
                            >
                              <UserPlus size={13} className="mr-1" />
                              Adicionar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingGroup(group);
                                setGroupFormOpen(true);
                              }}
                              className="h-8 px-2 text-xs"
                            >
                              <Pencil size={13} />
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Resumo Automático em Tempo Real */}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs text-[var(--ink-muted)] pt-1">
                        <span className="font-semibold text-[var(--ink)]">
                          {totalPublicadores} {totalPublicadores === 1 ? "Publicador" : "Publicadores"}
                        </span>
                        <span>•</span>
                        <span>
                          {totalAnciaos} {totalAnciaos === 1 ? "Ancião" : "Anciãos"}
                        </span>
                        <span>•</span>
                        <span>
                          {totalServos} {totalServos === 1 ? "Servo ministerial" : "Servos ministeriais"}
                        </span>
                        <span>•</span>
                        <span>
                          {totalPioneiros} {totalPioneiros === 1 ? "Pioneiro" : "Pioneiros"}
                        </span>
                      </div>
                    </div>

                    {/* Lista de Membros do Grupo */}
                    {groupMembers.length === 0 ? (
                      <div className="py-4 text-center text-caption text-[var(--ink-muted)] italic">
                        Nenhum irmão alocado neste grupo ainda.
                      </div>
                    ) : (
                      <div className="flex flex-col divide-y divide-[var(--border)]/40 -mx-1">
                        {groupMembers.map((m, index) => {
                          const isSelf = isCurrentUserMember(m, { memberId, userId });
                          const isOverseer = m.id === group.overseer_id;
                          const isAssistant = m.id === group.assistant_id;
                          const badges = getGroupMemberBadges(m, isOverseer, isAssistant);

                          return (
                            <div
                              key={m.id}
                              className="py-2 px-1 flex items-center justify-between gap-2 hover:bg-[var(--background)]/60 rounded-md transition-colors"
                            >
                              {/* Lado esquerdo: Número sequencial + Nome + Badges */}
                              <div
                                onClick={() => setSelectedMember(m)}
                                className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
                              >
                                <span className="text-2xs font-mono font-semibold text-[var(--ink-muted)] w-5 text-right shrink-0">
                                  {index + 1}.
                                </span>
                                <div className="flex flex-col min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-body-sm font-medium text-[var(--ink)] hover:text-[var(--primary)] transition-colors">
                                      {m.full_name}
                                    </span>
                                    {isSelf && (
                                      <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-[var(--primary)] text-white">
                                        Você
                                      </span>
                                    )}
                                  </div>

                                  {/* Badges de Função e Designação */}
                                  {badges.length > 0 && (
                                    <div className="flex items-center gap-1 flex-wrap mt-0.5">
                                      {badges.map((b, i) => (
                                        <span
                                          key={i}
                                          className={`text-[10px] px-2 py-0.2 rounded-full border leading-tight ${
                                            b.variant === "overseer"
                                              ? "bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/25 font-semibold"
                                              : b.variant === "assistant"
                                              ? "bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/30 font-semibold"
                                              : "bg-[var(--background)] text-[var(--ink-muted)] border-[var(--border)]"
                                          }`}
                                        >
                                          {b.text}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Lado direito: Ações Rápidas */}
                              <div className="flex items-center gap-0.5 shrink-0">
                                {canManageMembers && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => setTransferMember(m)}
                                      className="p-1.5 rounded-md hover:bg-[var(--background)] text-[var(--ink-muted)] hover:text-[var(--primary)] transition-colors cursor-pointer"
                                      title="Transferir de grupo"
                                      aria-label="Transferir de grupo"
                                    >
                                      <ArrowRightLeft size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveMemberFromGroup(m)}
                                      className="p-1.5 rounded-md hover:bg-red-500/10 text-[var(--ink-muted)] hover:text-red-500 transition-colors cursor-pointer"
                                      title="Remover do grupo"
                                      aria-label="Remover do grupo"
                                    >
                                      <UserMinus size={14} />
                                    </button>
                                  </>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setSelectedMember(m)}
                                  className="p-1.5 rounded-md hover:bg-[var(--background)] text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
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

              {/* ── BLOCO "SEM GRUPO" NO FINAL DA ABA GRUPOS ── */}
              <Card className="p-4 flex flex-col gap-3 shadow-xs border-dashed border-[var(--border)] bg-[var(--background)]/40">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                  <div>
                    <h3 className="font-display font-semibold text-base text-[var(--ink)]">
                      Sem grupo ({unassignedMembers.length})
                    </h3>
                    <p className="text-caption text-[var(--ink-muted)]">
                      Irmãos ativos que ainda não foram alocados em nenhum grupo de serviço.
                    </p>
                  </div>
                </div>

                {unassignedMembers.length === 0 ? (
                  <div className="py-4 text-center text-caption text-[var(--ink-muted)] italic">
                    Todos os irmãos ativos já estão alocados em seus grupos.
                  </div>
                ) : (
                  <div className="flex flex-col divide-y divide-[var(--border)]/40 -mx-1">
                    {unassignedMembers.map((m, index) => {
                      const badges = getGroupMemberBadges(m, false, false);

                      return (
                        <div
                          key={m.id}
                          className="py-2.5 px-1 flex items-center justify-between gap-2 hover:bg-[var(--background)] rounded-md transition-colors"
                        >
                          <div
                            onClick={() => setSelectedMember(m)}
                            className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
                          >
                            <span className="text-2xs font-mono font-semibold text-[var(--ink-muted)] w-5 text-right shrink-0">
                              {index + 1}.
                            </span>
                            <div className="flex flex-col min-w-0">
                              <span className="text-body-sm font-medium text-[var(--ink)] hover:text-[var(--primary)] transition-colors truncate">
                                {m.full_name}
                              </span>
                              {badges.length > 0 && (
                                <div className="flex items-center gap-1 flex-wrap mt-0.5">
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

                          {/* Botão direto para alocar */}
                          {canManageMembers && (
                            <div className="shrink-0 flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setTransferMember(m)}
                                className="h-8 px-2.5 text-xs"
                              >
                                <UserCheck size={13} className="mr-1" />
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
          )}
        </TabsContent>
      </Tabs>

      {/* ── SHEET DE CADASTRO / EDIÇÃO DE IRMÃO ── */}
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

      {/* ── SHEET DE DETALHES DO IRMÃO (HISTÓRICO DE VISITAS) ── */}
      <MemberDetailSheet
        member={selectedMember}
        open={!!selectedMember}
        onClose={() => setSelectedMember(null)}
        canManageMembers={canManageMembers}
        canUseShepherding={canUseShepherding}
        isCurrentUser={
          selectedMember
            ? isCurrentUserMember(selectedMember, { memberId, userId })
            : false
        }
        onEdit={(m) => {
          setSelectedMember(null);
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
      />

      {/* ── FORMULÁRIO DE NOVA VISITA / EDIÇÃO VINCULADO AO IRMÃO ── */}
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
