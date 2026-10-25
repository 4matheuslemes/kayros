"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Users,
  Pencil,
  HeartHandshake,
  UserPlus,
  ArrowRightLeft,
  Calendar,
  Clock,
  Shield,
  Archive,
  ChevronRight,
  UserCheck,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import type {
  MemberWithLastVisit,
  CongregationMember,
  ServiceGroup,
} from "@/lib/types/congregation";
import type { ShepherdingVisit } from "@/lib/types/pastoreio";
import { cn } from "@/lib/utils";

interface MemberDetailPanelProps {
  member: MemberWithLastVisit | null;
  assignedGroup: ServiceGroup | null;
  isSelf: boolean;
  canManageMembers: boolean;
  canUseShepherding: boolean;
  isElderOrAdmin: boolean;
  onEdit: (m: CongregationMember) => void;
  onNewVisit: (m: CongregationMember) => void;
  onSelectVisit: (v: ShepherdingVisit) => void;
  onTransfer: (m: CongregationMember) => void;
  className?: string;
}

export function MemberDetailPanel({
  member,
  assignedGroup,
  isSelf,
  canManageMembers,
  canUseShepherding,
  isElderOrAdmin,
  onEdit,
  onNewVisit,
  onSelectVisit,
  onTransfer,
  className,
}: MemberDetailPanelProps) {
  const [visits, setVisits] = useState<ShepherdingVisit[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(false);

  useEffect(() => {
    if (!member || !canUseShepherding || isSelf) {
      setVisits([]);
      return;
    }

    let isMounted = true;
    const fetchVisits = async () => {
      setLoadingVisits(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("shepherding_visit_members")
          .select("visit:shepherding_visits(*)")
          .eq("member_id", member.id);

        if (!error && data && isMounted) {
          const loaded = (data || [])
            .map((row: any) => row.visit)
            .filter(Boolean) as ShepherdingVisit[];

          loaded.sort((a, b) => {
            const cmp = b.visit_date.localeCompare(a.visit_date);
            if (cmp !== 0) return cmp;
            return (b.created_at || "").localeCompare(a.created_at || "");
          });

          setVisits(loaded);
        }
      } catch (err) {
        console.error("Error fetching member visits in detail panel:", err);
      } finally {
        if (isMounted) setLoadingVisits(false);
      }
    };

    fetchVisits();

    return () => {
      isMounted = false;
    };
  }, [member, canUseShepherding, isSelf]);

  if (!member) {
    return (
      <Card
        className={cn(
          "p-8 rounded-[28px] bg-[var(--panel)] border border-[var(--border)]/60 shadow-xs text-center flex flex-col items-center justify-center gap-3.5 min-h-[380px]",
          className
        )}
      >
        <div className="w-14 h-14 rounded-full bg-[var(--surface)] text-[var(--ink-muted)] flex items-center justify-center border border-[var(--border)]/70">
          <Users size={24} />
        </div>
        <div className="flex flex-col gap-1 max-w-xs">
          <h3 className="font-display font-medium text-lg text-[var(--ink)]">
            Ficha do Publicador
          </h3>
          <p className="text-xs text-[var(--ink-muted)] leading-relaxed">
            Selecione um publicador na tabela ao lado para visualizar os detalhes completos, histórico pastoral e ações.
          </p>
        </div>
      </Card>
    );
  }

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
  const initial = member.full_name ? member.full_name.charAt(0).toUpperCase() : "?";

  return (
    <Card
      className={cn(
        "p-6 rounded-[28px] bg-[var(--panel)] border border-[var(--border)]/60 shadow-xs flex flex-col gap-5",
        className
      )}
    >
      {/* ── CABEÇALHO DO PUBLICADOR ── */}
      <div className="flex items-start justify-between gap-3 pb-4 border-b border-[var(--border)]/70">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-full bg-[var(--primary)] text-white font-display font-semibold text-lg flex items-center justify-center shrink-0 shadow-2xs">
            {initial}
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display font-medium text-lg sm:text-xl text-[var(--ink)] truncate">
                {member.full_name}
              </h3>
              {isSelf && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--primary)] text-white">
                  <Shield size={10} />
                  Você
                </span>
              )}
              {!member.active && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                  <Archive size={10} />
                  Arquivado
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap mt-1">
              {appLabel && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--ink)]">
                  {appLabel}
                </span>
              )}
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--ink-muted)]">
                {statusLabel}
              </span>
            </div>
          </div>
        </div>

        {canManageMembers && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onEdit(member)}
            className="rounded-full h-8 px-3 text-xs shrink-0"
            title="Editar cadastro"
          >
            <Pencil size={13} className="mr-1" />
            Editar
          </Button>
        )}
      </div>

      {/* ── DADOS DO GRUPO E SITUAÇÃO ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="flex flex-col gap-1 p-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)]/60">
          <span className="text-[10px] uppercase font-semibold text-[var(--ink-muted)] tracking-wider">
            Grupo de Serviço
          </span>
          <div className="flex items-center justify-between gap-1 mt-0.5">
            <span className="font-medium text-[var(--ink)] truncate">
              {assignedGroup
                ? `${assignedGroup.sort_order}. ${assignedGroup.name}`
                : "Sem grupo atribuído"}
            </span>
            {canManageMembers && (
              <button
                type="button"
                onClick={() => onTransfer(member)}
                className="text-[11px] font-semibold text-[var(--primary)] hover:underline shrink-0 cursor-pointer"
              >
                Alterar
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1 p-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)]/60">
          <span className="text-[10px] uppercase font-semibold text-[var(--ink-muted)] tracking-wider">
            Função no Grupo
          </span>
          <span className="font-medium text-[var(--ink)] mt-0.5">
            {assignedGroup?.overseer_id === member.id
              ? "Superintendente do grupo"
              : assignedGroup?.assistant_id === member.id
              ? "Ajudante do grupo"
              : "Membro do grupo"}
          </span>
        </div>
      </div>

      {/* ── ATALHOS RÁPIDOS OPERACIONAIS ── */}
      <div className="flex flex-col gap-2 pt-1">
        {canUseShepherding && !isSelf && (
          <Button
            variant="primary"
            className="w-full rounded-xl justify-center h-10 text-xs font-semibold"
            onClick={() => onNewVisit(member)}
          >
            <HeartHandshake size={15} className="mr-1.5" />
            Registrar visita de pastoreio
          </Button>
        )}

        {isElderOrAdmin && !isSelf && (
          <Link
            href={`/convidar?memberId=${member.id}`}
            className="w-full rounded-xl flex items-center justify-center h-10 text-xs font-semibold bg-[var(--surface)] hover:bg-[var(--background)] border border-[var(--border)] text-[var(--ink)] transition-colors"
          >
            <UserPlus size={15} className="mr-1.5 text-[var(--primary)]" />
            Gerar convite de acesso
          </Link>
        )}

      </div>

      {/* ── HISTÓRICO DE VISITAS PASTORAIS ── */}
      {canUseShepherding && !isSelf && (
        <div className="flex flex-col gap-2.5 pt-3 border-t border-[var(--border)]/70">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
              Histórico de Pastoreio ({visits.length})
            </span>
            {member.last_visit_date && (
              <span className="text-2xs text-[var(--ink-muted)]">
                Última: {format(parseISO(member.last_visit_date), "dd/MM/yyyy")}
              </span>
            )}
          </div>

          {loadingVisits ? (
            <div className="p-4 text-center text-xs text-[var(--ink-muted)] flex items-center justify-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
              <span>Carregando visitas...</span>
            </div>
          ) : visits.length === 0 ? (
            <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]/50 text-center text-xs text-[var(--ink-muted)] italic">
              Nenhuma visita registrada para este publicador.
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto pr-1">
              {visits.map((v) => {
                const formattedDate = (() => {
                  try {
                    return format(parseISO(v.visit_date), "dd 'de' MMM 'de' yyyy", { locale: ptBR });
                  } catch {
                    return v.visit_date;
                  }
                })();

                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => onSelectVisit(v)}
                    className="w-full text-left p-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)]/60 hover:border-[var(--primary)]/50 transition-all flex items-center justify-between gap-2.5 group cursor-pointer"
                  >
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ink)] group-hover:text-[var(--primary)] transition-colors">
                        <Calendar size={13} className="text-[var(--primary)] shrink-0" />
                        <span>{formattedDate}</span>
                      </div>
                      {v.companion && (
                        <span className="text-[11px] text-[var(--ink-muted)] truncate mt-0.5">
                          Com {v.companion}
                        </span>
                      )}
                      {v.report && (
                        <p className="text-[11px] text-[var(--ink-muted)] italic line-clamp-1 mt-0.5">
                          "{v.report}"
                        </p>
                      )}
                    </div>
                    <ChevronRight
                      size={15}
                      className="text-[var(--ink-muted)] group-hover:text-[var(--primary)] shrink-0 transition-transform group-hover:translate-x-0.5"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
