"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { HeartHandshake, CalendarClock, Users, Home, Plus, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PastoralCareCardProps {
  canUseShepherding: boolean;
  canViewMembers: boolean;
  dueCount?: number;
  latestVisit?: {
    family_or_person: string;
    visit_date: string;
    created_by_name?: string | null;
  } | null;
}

export function PastoralCareCard({
  canUseShepherding,
  canViewMembers,
  dueCount = 0,
  latestVisit,
}: PastoralCareCardProps) {
  const formattedLatestDate = (() => {
    if (!latestVisit?.visit_date) return null;
    try {
      return format(parseISO(latestVisit.visit_date), "dd 'de' MMM", {
        locale: ptBR,
      });
    } catch {
      return latestVisit.visit_date;
    }
  })();

  return (
    <Card className="p-4 flex flex-col gap-3.5 bg-[var(--surface)] border-[var(--border)] shadow-xs rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
            <HeartHandshake size={18} />
          </div>
          <h2 className="font-display font-semibold text-base text-[var(--ink)]">
            Cuidado Pastoral & Congregação
          </h2>
        </div>
      </div>

      {canUseShepherding && (
        <div className="flex flex-col gap-2.5">
          {/* Alerta de irmãos na hora de visitar */}
          <Link
            href="/irmaos?filter=na_hora"
            className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--background)] hover:bg-[var(--background)]/80 border border-[var(--border)] transition-colors group"
          >
            <div className="flex items-center gap-2 min-w-0">
              <CalendarClock
                size={16}
                className={
                  dueCount > 0 ? "text-[var(--accent)]" : "text-[var(--primary)]"
                }
              />
              <span className="text-body-sm font-medium text-[var(--ink)] truncate">
                {dueCount > 0
                  ? `${dueCount} ${
                      dueCount === 1 ? "irmão está" : "irmãos estão"
                    } na hora de visitar`
                  : "Todos os irmãos estão em dia com as visitas"}
              </span>
            </div>
            <ChevronRight
              size={16}
              className="text-[var(--ink-muted)] group-hover:text-[var(--ink)] shrink-0 transition-transform group-hover:translate-x-0.5"
            />
          </Link>

          {/* Última visita registrada */}
          {latestVisit && (
            <div className="text-caption text-[var(--ink-muted)] px-1 flex items-center gap-1.5 flex-wrap">
              <span>Última visita:</span>
              <span className="font-medium text-[var(--ink)]">
                {latestVisit.family_or_person}
              </span>
              {formattedLatestDate && (
                <>
                  <span>•</span>
                  <span>{formattedLatestDate}</span>
                </>
              )}
              {latestVisit.created_by_name && (
                <span className="text-2xs text-[var(--ink-muted)]/80">
                  (por {latestVisit.created_by_name})
                </span>
              )}
            </div>
          )}

          {/* Botões rápidos de ação */}
          <div className="flex gap-2 pt-1">
            <Link
              href="/pastoreio?nova=true"
              className={cn(buttonVariants({ variant: "primary", size: "sm" }), "flex-1")}
            >
              <Plus size={14} className="mr-1.5" />
              Nova visita
            </Link>
            <Link
              href="/pastoreio"
              className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "flex-1")}
            >
              Ver Pastoreio
            </Link>
          </div>
        </div>
      )}

      {/* Atalhos para Grupos de Serviço e Lista de Irmãos */}
      {canViewMembers && (
        <div className="flex gap-2 pt-1 border-t border-[var(--border)]/60">
          <Link
            href="/irmaos?tab=grupos"
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md bg-[var(--background)] hover:bg-[var(--background)]/80 border border-[var(--border)] text-xs font-medium text-[var(--ink)] transition-colors"
          >
            <Home size={14} className="text-[var(--primary)]" />
            <span>Grupos de Serviço</span>
          </Link>
          <Link
            href="/irmaos"
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md bg-[var(--background)] hover:bg-[var(--background)]/80 border border-[var(--border)] text-xs font-medium text-[var(--ink)] transition-colors"
          >
            <Users size={14} className="text-[var(--primary)]" />
            <span>Lista de Irmãos</span>
          </Link>
        </div>
      )}
    </Card>
  );
}
