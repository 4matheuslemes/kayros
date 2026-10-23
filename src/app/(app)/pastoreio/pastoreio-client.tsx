"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  HeartHandshake,
  Plus,
  Search,
  Calendar,
  Users,
  CalendarClock,
  ShieldAlert,
  ArrowLeft,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/client";
import type { ShepherdingVisit } from "@/lib/types/pastoreio";
import { PastoreioLockGate } from "@/components/pastoreio/pastoreio-lock-gate";
import { PastoreioFormSheet } from "@/components/pastoreio/pastoreio-form-sheet";
import { PastoreioDetailSheet } from "@/components/pastoreio/pastoreio-detail-sheet";

interface PastoreioClientProps {
  userId: string;
}

export function PastoreioClient({ userId }: PastoreioClientProps) {
  const searchParams = useSearchParams();
  const [isUnlocked, setIsUnlocked] = useState<boolean | null>(null);
  const [hasPinConfigured, setHasPinConfigured] = useState(false);

  const [visits, setVisits] = useState<ShepherdingVisit[]>([]);
  const [membersMap, setMembersMap] = useState<Map<string, string>>(new Map());
  const [visitMembersMap, setVisitMembersMap] = useState<Map<string, string[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<ShepherdingVisit | null>(null);
  const [detailVisit, setDetailVisit] = useState<ShepherdingVisit | null>(null);

  // Check PIN security on mount
  useEffect(() => {
    const pin = typeof window !== "undefined" ? localStorage.getItem("app_pin_hash") : null;
    const hasPin = !!pin;
    setHasPinConfigured(hasPin);
    if (!hasPin) {
      setIsUnlocked(true);
    } else {
      setIsUnlocked(false);
    }
  }, []);

  // Fetch visits, members, and visit_members link table
  const fetchVisits = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    try {
      const [visitsRes, membersRes, visitMembersRes] = await Promise.all([
        supabase
          .from("shepherding_visits")
          .select("*")
          .order("visit_date", { ascending: false })
          .order("created_at", { ascending: false }),
        supabase
          .from("congregation_members")
          .select("id, full_name"),
        supabase
          .from("shepherding_visit_members")
          .select("visit_id, member_id"),
      ]);

      if (membersRes.data) {
        const mMap = new Map<string, string>();
        for (const m of membersRes.data) {
          mMap.set(m.id, m.full_name);
        }
        setMembersMap(mMap);
      }

      const vMap = new Map<string, string[]>();
      if (visitMembersRes.data) {
        for (const vm of visitMembersRes.data) {
          const current = vMap.get(vm.visit_id) || [];
          current.push(vm.member_id);
          vMap.set(vm.visit_id, current);
        }
        setVisitMembersMap(vMap);
      }

      if (visitsRes.error) {
        console.error("Error fetching shepherding visits:", visitsRes.error);
        toast.error("Não foi possível carregar as visitas");
      } else {
        const loaded = (visitsRes.data || []).map((v: any) => ({
          ...v,
          member_ids: vMap.get(v.id) || [],
        }));
        setVisits(loaded as ShepherdingVisit[]);
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro de conexão ao carregar visitas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isUnlocked) {
      fetchVisits();
      if (searchParams.get("nova") === "true") {
        setFormOpen(true);
      }
    }
  }, [isUnlocked, fetchVisits, searchParams]);

  // Resolve all visited names for a visit (linked members + other_people, fallback to family_or_person)
  const getVisitedNames = useCallback(
    (visit: ShepherdingVisit): string[] => {
      const linkedIds = visit.member_ids || visitMembersMap.get(visit.id) || [];
      const memberNames = linkedIds
        .map((id) => membersMap.get(id))
        .filter(Boolean) as string[];

      const others = visit.other_people || [];
      const combined = [...memberNames, ...others];

      if (combined.length > 0) return combined;
      return visit.family_or_person ? [visit.family_or_person] : [];
    },
    [membersMap, visitMembersMap]
  );

  // Format visited names: up to 2 names and "+N" when more
  const formatVisitedSummary = useCallback((names: string[]): string => {
    if (names.length === 0) return "Sem identificação";
    if (names.length <= 2) return names.join(", ");
    return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
  }, []);

  // Filtered visits based on real-time search
  const filteredVisits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return visits;

    return visits.filter((v) => {
      const visitedNames = getVisitedNames(v);
      const namesMatch = visitedNames.some((name) => name.toLowerCase().includes(q));
      const legacyMatch = v.family_or_person?.toLowerCase().includes(q);
      const companionName = v.companion_member_id
        ? membersMap.get(v.companion_member_id)
        : v.companion;
      const companionMatch = companionName?.toLowerCase().includes(q);
      const reportMatch = v.report?.toLowerCase().includes(q);

      return namesMatch || legacyMatch || companionMatch || reportMatch;
    });
  }, [visits, query, getVisitedNames, membersMap]);

  // Handle Saved visit (create or edit)
  const handleSaved = (saved: ShepherdingVisit) => {
    if (saved.member_ids) {
      setVisitMembersMap((prev) => {
        const next = new Map(prev);
        next.set(saved.id, saved.member_ids || []);
        return next;
      });
    }

    setVisits((prev) => {
      const idx = prev.findIndex((v) => v.id === saved.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = saved;
        return updated.sort((a, b) => b.visit_date.localeCompare(a.visit_date));
      }
      return [saved, ...prev].sort((a, b) => b.visit_date.localeCompare(a.visit_date));
    });

    if (detailVisit && detailVisit.id === saved.id) {
      setDetailVisit(saved);
    }
  };

  // Handle Delete
  const handleDelete = async (visitId: string) => {
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
    setVisits((prev) => prev.filter((v) => v.id !== visitId));
    setVisitMembersMap((prev) => {
      const next = new Map(prev);
      next.delete(visitId);
      return next;
    });

    if (detailVisit?.id === visitId) {
      setDetailVisit(null);
    }
  };

  // State: Loading LockGate
  if (isUnlocked === null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // State: Locked by PIN Gate
  if (isUnlocked === false) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <AppHeader title="Pastoreio" />
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
          title="Pastoreio"
          subtitle="Registro de visitas pastorais"
          right={
            <Button
              size="sm"
              onClick={() => {
                setEditingVisit(null);
                setFormOpen(true);
              }}
            >
              <Plus size={16} className="mr-1" />
              Nova visita
            </Button>
          }
        />
      </div>

      {/* Security alert if PIN is not configured */}
      {!hasPinConfigured && (
        <div className="flex items-start gap-3 p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-body-sm text-amber-800 dark:text-amber-200">
          <ShieldAlert size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <span className="font-semibold block mb-0.5">Proteção recomendada</span>
            Para proteger as visitas contra olhares curiosos no aparelho, configure um PIN ou
            biometria em{" "}
            <Link href="/perfil" className="underline font-medium hover:opacity-80">
              Perfil &gt; Bloqueio do aplicativo
            </Link>
            .
          </div>
        </div>
      )}

      {/* Search Bar */}
      {visits.length > 0 && (
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, acompanhante ou relatório..."
            className="pl-10 h-10 text-body-sm"
          />
        </div>
      )}

      {/* Main List */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 bg-[var(--surface)] border border-[var(--border)] rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : visits.length === 0 ? (
        <Card className="py-8">
          <EmptyState
            icon={<HeartHandshake size={32} className="text-[var(--primary)]" />}
            title="Nenhuma visita registrada"
            description="Mantenha o registro confidencial das visitas pastorais realizadas e acompanhamentos futuros."
            action={
              <Button
                onClick={() => {
                  setEditingVisit(null);
                  setFormOpen(true);
                }}
              >
                <Plus size={16} className="mr-1.5" />
                Registrar primeira visita
              </Button>
            }
          />
        </Card>
      ) : filteredVisits.length === 0 ? (
        <Card className="py-8">
          <EmptyState
            title="Nenhum resultado encontrado"
            description={`Nenhuma visita encontrada para "${query}".`}
            action={
              <Button variant="secondary" size="sm" onClick={() => setQuery("")}>
                Limpar busca
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-caption font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
              Visitas ({filteredVisits.length})
            </span>
          </div>

          {filteredVisits.map((visit) => {
            const visitedNames = getVisitedNames(visit);
            const displayTitle = formatVisitedSummary(visitedNames);

            const formattedDate = (() => {
              try {
                return format(parseISO(visit.visit_date), "dd 'de' MMMM, yyyy", { locale: ptBR });
              } catch {
                return visit.visit_date;
              }
            })();

            const formattedNext = (() => {
              if (!visit.next_visit_date) return null;
              try {
                return format(parseISO(visit.next_visit_date), "dd/MM/yyyy");
              } catch {
                return visit.next_visit_date;
              }
            })();

            const companionDisplayName = visit.companion_member_id
              ? membersMap.get(visit.companion_member_id) || visit.companion
              : visit.companion;

            return (
              <button
                key={visit.id}
                type="button"
                onClick={() => setDetailVisit(visit)}
                className="w-full text-left bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 hover:border-[var(--primary)]/50 active:bg-[var(--background)] transition-all shadow-xs flex items-center justify-between gap-3 group cursor-pointer"
              >
                <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-display font-semibold text-base text-[var(--ink)] truncate group-hover:text-[var(--primary)] transition-colors">
                      {displayTitle}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-caption text-[var(--ink-muted)]">
                    <Calendar size={13} className="shrink-0 text-[var(--ink-muted)]" />
                    <span>{formattedDate}</span>
                    <span>•</span>
                    <span className="truncate">Realizada por: {visit.created_by_name || "Ancião"}</span>
                  </div>

                  {/* Indicators for Companion and Next Visit */}
                  {(companionDisplayName || formattedNext) && (
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      {companionDisplayName && (
                        <span className="inline-flex items-center gap-1 text-2xs text-[var(--ink-muted)] bg-[var(--background)] px-2 py-0.5 rounded-full border border-[var(--border)]">
                          <Users size={11} className="shrink-0" />
                          <span className="truncate max-w-[140px]">
                            Acompanhante: {companionDisplayName}
                          </span>
                        </span>
                      )}

                      {formattedNext && (
                        <span className="inline-flex items-center gap-1 text-2xs text-[var(--primary)] bg-[var(--primary)]/10 px-2 py-0.5 rounded-full border border-[var(--primary)]/20 font-medium">
                          <CalendarClock size={11} className="shrink-0" />
                          <span>Próxima: {formattedNext}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Form Sheet (Create / Edit) */}
      <PastoreioFormSheet
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingVisit(null);
        }}
        userId={userId}
        initialData={editingVisit}
        preselectedMemberId={searchParams.get("member_id")}
        onSaved={handleSaved}
      />

      {/* Detail Sheet */}
      <PastoreioDetailSheet
        visit={detailVisit}
        open={!!detailVisit}
        onClose={() => setDetailVisit(null)}
        onEdit={(visit) => {
          setEditingVisit(visit);
          setFormOpen(true);
        }}
        onDelete={handleDelete}
        visitedNames={detailVisit ? getVisitedNames(detailVisit) : []}
        linkedCompanionName={
          detailVisit?.companion_member_id
            ? membersMap.get(detailVisit.companion_member_id)
            : null
        }
        currentUserId={userId}
      />
    </div>
  );
}
