"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar,
  Users,
  Pencil,
  HeartHandshake,
  ChevronRight,
  Shield,
  Archive,
} from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { MemberWithLastVisit, CongregationMember } from "@/lib/types/congregation";
import type { ShepherdingVisit } from "@/lib/types/pastoreio";

interface MemberDetailSheetProps {
  member: MemberWithLastVisit | null;
  open: boolean;
  onClose: () => void;
  onEdit: (member: CongregationMember) => void;
  onNewVisit: (member: CongregationMember) => void;
  onSelectVisit: (visit: ShepherdingVisit) => void;
  canManageMembers?: boolean;
  canUseShepherding?: boolean;
  isCurrentUser?: boolean;
}

export function MemberDetailSheet({
  member,
  open,
  onClose,
  onEdit,
  onNewVisit,
  onSelectVisit,
  canManageMembers = true,
  canUseShepherding = true,
  isCurrentUser = false,
}: MemberDetailSheetProps) {
  const [visits, setVisits] = useState<ShepherdingVisit[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(false);

  const isSelf = isCurrentUser || !!member?.is_self;

  useEffect(() => {
    if (!open || !member || !canUseShepherding || isSelf) {
      setVisits([]);
      return;
    }

    let isMounted = true;
    const fetchMemberVisits = async () => {
      setLoadingVisits(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("shepherding_visit_members")
          .select("visit:shepherding_visits(*)")
          .eq("member_id", member.id);

        if (!error && data && isMounted) {
          const loadedVisits = (data || [])
            .map((row: any) => row.visit)
            .filter(Boolean) as ShepherdingVisit[];

          loadedVisits.sort((a, b) => {
            const dateCmp = b.visit_date.localeCompare(a.visit_date);
            if (dateCmp !== 0) return dateCmp;
            return (b.created_at || "").localeCompare(a.created_at || "");
          });

          setVisits(loadedVisits);
        }
      } catch (e) {
        console.error("Error loading visits for member:", e);
      } finally {
        if (isMounted) setLoadingVisits(false);
      }
    };

    fetchMemberVisits();

    return () => {
      isMounted = false;
    };
  }, [open, member, canUseShepherding, isSelf]);

  if (!member) return null;

  const formatServiceStatus = (status: string) => {
    switch (status) {
      case "pioneiro_regular":
        return "Pioneiro regular";
      case "pioneiro_auxiliar_continuo":
        return "Pioneiro auxiliar contínuo";
      case "publicador_nao_batizado":
        return "Não batizado";
      case "publicador_batizado":
      default:
        return "Publicador batizado";
    }
  };

  const formatAppointment = (app?: string | null) => {
    if (app === "anciao") return "Ancião";
    if (app === "servo_ministerial") return "Servo ministerial";
    return null;
  };

  const appLabel = formatAppointment(member.appointment);
  const statusLabel = formatServiceStatus(member.service_status);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={member.full_name}
      description="Registro congregacional confidencial"
    >
      <div className="flex flex-col gap-5 mt-2">
        {/* ── METADADOS DO IRMÃO ── */}
        <div className="flex flex-col gap-2.5 bg-[var(--background)]/60 border border-[var(--border)] rounded-lg p-3.5">
          <div className="flex flex-wrap items-center gap-2">
            {isSelf && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[var(--primary)] text-white">
                <Shield size={12} />
                Você
              </span>
            )}

            {appLabel && (
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--ink)]">
                {appLabel}
              </span>
            )}

            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--ink-muted)]">
              {statusLabel}
            </span>

            {!member.active && (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                <Archive size={12} />
                Arquivado
              </span>
            )}
          </div>

          {isSelf && (
            <p className="text-caption text-[var(--ink-muted)] italic mt-1">
              Este é o seu registro pessoal na lista de membros.
            </p>
          )}
        </div>

        {/* ── BOTÕES DE AÇÃO ── */}
        {!isSelf && (
          <div className="flex gap-2.5">
            {canUseShepherding && (
              <Button
                className="flex-1"
                onClick={() => {
                  onClose();
                  onNewVisit(member);
                }}
              >
                <HeartHandshake size={16} className="mr-1.5" />
                Nova visita
              </Button>
            )}

            {canManageMembers && (
              <Button
                variant="secondary"
                className={canUseShepherding ? "" : "flex-1"}
                onClick={() => {
                  onClose();
                  onEdit(member);
                }}
              >
                <Pencil size={15} className="mr-1.5 text-[var(--ink-muted)]" />
                Editar
              </Button>
            )}
          </div>
        )}

        {/* ── HISTÓRICO DE VISITAS DE PASTOREIO ── */}
        {!isSelf && canUseShepherding && (
          <div className="flex flex-col gap-2.5 pt-2">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-caption font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                Histórico de Pastoreio ({visits.length})
              </h4>
            </div>

            {loadingVisits ? (
              <div className="p-6 text-center text-body-sm text-[var(--ink-muted)] flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                <span>Carregando visitas...</span>
              </div>
            ) : visits.length === 0 ? (
              <div className="p-5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-center text-body-sm text-[var(--ink-muted)] italic">
                Nenhuma visita de pastoreio registrada para este irmão.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {visits.map((v) => {
                  const formattedDate = (() => {
                    try {
                      return format(parseISO(v.visit_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
                    } catch {
                      return v.visit_date;
                    }
                  })();

                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        onClose();
                        onSelectVisit(v);
                      }}
                      className="w-full text-left p-3.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--primary)]/50 active:bg-[var(--background)] transition-colors flex items-center justify-between gap-3 group"
                    >
                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-body-sm font-medium text-[var(--ink)] group-hover:text-[var(--primary)] transition-colors">
                          <Calendar size={14} className="text-[var(--primary)] shrink-0" />
                          <span>{formattedDate}</span>
                        </div>

                        {v.companion ? (
                          <div className="flex items-center gap-1.5 text-caption text-[var(--ink-muted)]">
                            <Users size={13} className="shrink-0" />
                            <span className="truncate">Acompanhado por: {v.companion}</span>
                          </div>
                        ) : (
                          <span className="text-caption text-[var(--ink-muted)] italic">
                            Sem acompanhante
                          </span>
                        )}

                        {v.report && (
                          <p className="text-caption text-[var(--ink-muted)] line-clamp-1 italic mt-0.5">
                            "{v.report}"
                          </p>
                        )}
                      </div>

                      <ChevronRight
                        size={16}
                        className="text-[var(--ink-muted)] group-hover:text-[var(--primary)] shrink-0 transition-colors"
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {isSelf && canManageMembers && (
          <div className="pt-2">
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                onClose();
                onEdit(member);
              }}
            >
              <Pencil size={15} className="mr-1.5 text-[var(--ink-muted)]" />
              Editar dados do seu cadastro
            </Button>
          </div>
        )}
      </div>
    </Drawer>
  );
}
