"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
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
} from "lucide-react";
import { formatDistanceToNow, parseISO, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/client";
import { PastoreioLockGate } from "@/components/pastoreio/pastoreio-lock-gate";
import { PastoreioDetailSheet } from "@/components/pastoreio/pastoreio-detail-sheet";
import { PastoreioFormSheet } from "@/components/pastoreio/pastoreio-form-sheet";
import { MemberFormSheet } from "@/components/irmaos/member-form-sheet";
import { MemberDetailSheet } from "@/components/irmaos/member-detail-sheet";
import type {
  CongregationMember,
  MemberWithLastVisit,
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
  const [isUnlocked, setIsUnlocked] = useState<boolean | null>(null);
  const [members, setMembers] = useState<MemberWithLastVisit[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros e busca
  const [filter, setFilter] = useState<FilterType>("todos");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortByType>("nome");

  // Painéis
  const [memberFormOpen, setMemberFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<CongregationMember | null>(null);
  const [selectedMember, setSelectedMember] = useState<MemberWithLastVisit | null>(null);

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

  // Fetch all members + compute last visit and next visit in a SINGLE aggregated pass via shepherding_visit_members
  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    try {
      // Duas consultas paralelas: 1 para membros, 1 para vínculos de visitas com visita embutida
      const [membersRes, visitMembersRes] = await Promise.all([
        supabase
          .from("congregation_members")
          .select("*")
          .order("full_name", { ascending: true }),
        supabase
          .from("shepherding_visit_members")
          .select("member_id, visit:shepherding_visits(id, visit_date, next_visit_date, created_at, companion, companion_member_id)"),
      ]);

      if (membersRes.error) {
        console.error("Error fetching members:", membersRes.error);
        toast.error("Erro ao carregar lista de irmãos");
        return;
      }

      // Mapa da visita mais recente para cada member_id (maior visit_date, desempatando por created_at)
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
          // Desempate por visit_date e created_at
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

      const merged: MemberWithLastVisit[] = (membersRes.data || []).map((m) => {
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

  // Contagens para os chips de filtro
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

      // Na hora de visitar: próxima visita é hoje ou anterior (quem nunca recebeu visita tem next_visit_date nulo e não entra)
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

  // Lista filtrada e ordenada
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

    // 2. Busca por nome instantânea
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((m) => m.full_name.toLowerCase().includes(q));
    }

    // 3. Ordenação
    return [...list].sort((a, b) => {
      if (sortBy === "tempo_sem_visita") {
        // is_self não recebe visitas: vai para o final
        if (a.is_self && !b.is_self) return 1;
        if (!a.is_self && b.is_self) return -1;
        if (a.is_self && b.is_self) return a.full_name.localeCompare(b.full_name, "pt-BR");

        // Quem nunca recebeu visita vem primeiro
        if (!a.last_visit_date && b.last_visit_date) return -1;
        if (a.last_visit_date && !b.last_visit_date) return 1;
        if (!a.last_visit_date && !b.last_visit_date) {
          return a.full_name.localeCompare(b.full_name, "pt-BR");
        }

        // Ambas têm visita: a mais antiga vem primeiro
        const dateComp = (a.last_visit_date || "").localeCompare(b.last_visit_date || "");
        if (dateComp !== 0) return dateComp;
        return a.full_name.localeCompare(b.full_name, "pt-BR");
      }

      // Padrão: Nome (A-Z)
      return a.full_name.localeCompare(b.full_name, "pt-BR");
    });
  }, [members, filter, query, sortBy, today]);

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

  // Monta texto discreto das designações
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

  // Callback ao salvar nova visita a partir da ficha do irmão
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
          }
        />
      </div>

      {/* ── BARRA DE CONTROLE: BUSCA E ORDENAÇÃO ── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          {/* Busca por nome */}
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

        {/* ── CHIPS DE FILTRO COM CONTAGEM ── */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
          {[
            { id: "todos", label: "Todos", count: counts.todos },
            { id: "na_hora", label: "Na hora de visitar", count: counts.na_hora },
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

        {/* ── LISTA DE IRMÃOS ── */}
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
                <Button onClick={() => setMemberFormOpen(true)}>
                  <Plus size={16} className="mr-1" />
                  Cadastrar primeiro irmão
                </Button>
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

            {filteredAndSortedMembers.map((m) => {
              const designations = formatDesignations(m);
              const lastVisitText = formatLastVisit(m.last_visit_date);
              const hasNoVisit = !m.last_visit_date;

              const nextVisitFormatted = formatNextVisit(m.next_visit_date);
              const isDue = !!(m.next_visit_date && m.next_visit_date <= today);

              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMember(m)}
                  className="w-full text-left bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3.5 hover:border-[var(--primary)]/50 active:bg-[var(--background)] transition-all shadow-xs flex items-center justify-between gap-3 group cursor-pointer"
                >
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-semibold text-base text-[var(--ink)] truncate group-hover:text-[var(--primary)] transition-colors">
                        {m.full_name}
                      </span>
                      {m.is_self && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.2 rounded-full bg-[var(--primary)] text-white">
                          Você
                        </span>
                      )}
                      {!m.active && (
                        <span className="text-[10px] font-medium px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400">
                          Arquivado
                        </span>
                      )}
                    </div>

                    {designations && (
                      <span className="text-caption text-[var(--ink-muted)] truncate">
                        {designations}
                      </span>
                    )}

                    {/* Linhas de visita: omitidas na linha própria do usuário */}
                    {!m.is_self && (
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
        )}
      </div>

      {/* ── SHEET DE CADASTRO / EDIÇÃO DE IRMÃO ── */}
      <MemberFormSheet
        open={memberFormOpen}
        onClose={() => {
          setMemberFormOpen(false);
          setEditingMember(null);
        }}
        userId={userId}
        initialData={editingMember}
        onSaved={handleMemberSaved}
        onDeleted={handleMemberDeleted}
      />

      {/* ── SHEET DE DETALHES DO IRMÃO (HISTÓRICO DE VISITAS) ── */}
      <MemberDetailSheet
        member={selectedMember}
        open={!!selectedMember}
        onClose={() => setSelectedMember(null)}
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
