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
  ChevronRight,
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
      // If user never configured PIN/biometrics, do not block access
      setIsUnlocked(true);
    } else {
      // Require unlock on entry
      setIsUnlocked(false);
    }
  }, []);

  // Fetch visits and members
  const fetchVisits = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    try {
      const [visitsRes, membersRes] = await Promise.all([
        supabase
          .from("shepherding_visits")
          .select("*")
          .order("visit_date", { ascending: false })
          .order("created_at", { ascending: false }),
        supabase
          .from("congregation_members")
          .select("id, full_name"),
      ]);

      if (membersRes.data) {
        const mMap = new Map<string, string>();
        for (const m of membersRes.data) {
          mMap.set(m.id, m.full_name);
        }
        setMembersMap(mMap);
      }

      if (visitsRes.error) {
        console.error("Error fetching shepherding visits:", visitsRes.error);
        toast.error("Não foi possível carregar as visitas");
      } else {
        setVisits((visitsRes.data as ShepherdingVisit[]) || []);
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

  // Filtered visits (considers both linked member names and legacy text fields)
  const filteredVisits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return visits;
    return visits.filter((v) => {
      const linkedPerson = v.member_id ? membersMap.get(v.member_id) : null;
      const linkedCompanion = v.companion_member_id ? membersMap.get(v.companion_member_id) : null;

      return (
        v.family_or_person.toLowerCase().includes(q) ||
        (linkedPerson && linkedPerson.toLowerCase().includes(q)) ||
        (v.companion && v.companion.toLowerCase().includes(q)) ||
        (linkedCompanion && linkedCompanion.toLowerCase().includes(q)) ||
        (v.report && v.report.toLowerCase().includes(q))
      );
    });
  }, [visits, query, membersMap]);

  // Handle Saved visit (create or edit)
  const handleSaved = (saved: ShepherdingVisit) => {
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
    if (detailVisit?.id === visitId) {
      setDetailVisit(null);
    }
  };

  // Waiting for initial check
  if (isUnlocked === null) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Locked gate
  if (!isUnlocked) {
    return <PastoreioLockGate onUnlock={() => setIsUnlocked(true)} />;
  }

  return (
    <div className="flex flex-col gap-5 pb-8">
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

      {/* Security notice if no PIN configured */}
      {!hasPinConfigured && (
        <div className="flex items-start gap-3 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-body-sm text-[var(--ink)] animate-in fade-in duration-200">
          <ShieldAlert size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-medium block leading-tight text-amber-900 dark:text-amber-200">
              Proteja suas anotações
            </span>
            <p className="text-caption text-amber-800/80 dark:text-amber-300/80 mt-1">
              Como as visitas de pastoreio contêm informações confidenciais, recomendamos configurar um PIN ou biometria no seu Perfil.
            </p>
            <Link
              href="/perfil"
              className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-300 mt-2 hover:underline"
            >
              Configurar PIN no Perfil &rarr;
            </Link>
          </div>
        </div>
      )}

      {/* Search Input */}
      {visits.length > 0 && (
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] pointer-events-none"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, acompanhante ou anotação..."
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

            return (
              <button
                key={visit.id}
                type="button"
                onClick={() => setDetailVisit(visit)}
                className="w-full text-left bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 hover:border-[var(--primary)]/50 active:bg-[var(--background)] transition-all shadow-xs flex items-center justify-between gap-3 group"
              >
                <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-display font-semibold text-base text-[var(--ink)] truncate group-hover:text-[var(--primary)] transition-colors">
                      {(visit.member_id && membersMap.get(visit.member_id)) || visit.family_or_person}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5 text-caption text-[var(--ink-muted)]">
                    <Calendar size={13} className="shrink-0 text-[var(--ink-muted)]" />
                    <span>{formattedDate}</span>
                  </div>

                  {/* Discreet indicators for Companion and Next Visit */}
                  {((visit.companion_member_id && membersMap.get(visit.companion_member_id)) || visit.companion || formattedNext) && (
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      {(visit.companion_member_id || visit.companion) && (
                        <span className="inline-flex items-center gap-1 text-2xs text-[var(--ink-muted)] bg-[var(--background)] px-2 py-0.5 rounded-full border border-[var(--border)]">
                          <Users size={11} className="shrink-0" />
                          <span className="truncate max-w-[140px]">
                            {(visit.companion_member_id && membersMap.get(visit.companion_member_id)) || visit.companion}
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

                  {/* Snippet preview */}
                  {visit.report && (
                    <p className="text-caption text-[var(--ink-muted)] line-clamp-1 mt-0.5 italic">
                      "{visit.report}"
                    </p>
                  )}
                </div>

                <ChevronRight
                  size={18}
                  className="text-[var(--ink-muted)] group-hover:text-[var(--primary)] transition-colors shrink-0"
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Form Drawer (Create / Edit) */}
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

      {/* Detail Drawer (View full report, edit trigger, delete) */}
      <PastoreioDetailSheet
        visit={detailVisit}
        open={!!detailVisit}
        linkedMemberName={detailVisit?.member_id ? membersMap.get(detailVisit.member_id) : null}
        linkedCompanionName={detailVisit?.companion_member_id ? membersMap.get(detailVisit.companion_member_id) : null}
        onClose={() => setDetailVisit(null)}
        onEdit={(visit) => {
          setEditingVisit(visit);
          setFormOpen(true);
        }}
        onDelete={handleDelete}
      />
    </div>
  );
}
