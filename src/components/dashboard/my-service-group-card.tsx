"use client";

import Link from "next/link";
import { Home, Clock, UserCheck, Shield, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";

export interface MyGroupInfo {
  name: string;
  sort_order: number;
  meeting_info: string;
  overseer_name?: string | null;
  assistant_name?: string | null;
}

interface MyServiceGroupCardProps {
  group: MyGroupInfo;
}

export function MyServiceGroupCard({ group }: MyServiceGroupCardProps) {
  return (
    <Card className="p-4 flex flex-col gap-2.5 bg-[var(--surface)] border-[var(--border)] shadow-xs rounded-lg">
      <Link
        href="/irmaos?tab=grupos"
        className="flex items-start justify-between gap-2 group"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
            <Home size={17} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-caption font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
              Meu Grupo de Serviço
            </span>
            <h3 className="font-display font-semibold text-base text-[var(--ink)] truncate group-hover:text-[var(--primary)] transition-colors">
              {group.sort_order}. {group.name}
            </h3>
          </div>
        </div>
        <ChevronRight
          size={18}
          className="text-[var(--ink-muted)] group-hover:text-[var(--primary)] shrink-0 transition-transform group-hover:translate-x-0.5 mt-1"
        />
      </Link>

      {group.meeting_info && (
        <div className="flex items-center gap-1.5 text-caption text-[var(--ink-muted)] pl-0.5">
          <Clock size={13} className="shrink-0 text-[var(--primary)]" />
          <span className="truncate">{group.meeting_info}</span>
        </div>
      )}

      {(group.overseer_name || group.assistant_name) && (
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[var(--border)]/60 text-2xs text-[var(--ink-muted)]">
          {group.overseer_name && (
            <span className="inline-flex items-center gap-1 bg-[var(--background)] px-2 py-0.5 rounded-full border border-[var(--border)]">
              <Shield size={11} className="text-[var(--primary)] shrink-0" />
              <span className="truncate max-w-[150px]">
                Superintendente: <strong className="font-medium text-[var(--ink)]">{group.overseer_name}</strong>
              </span>
            </span>
          )}
          {group.assistant_name && (
            <span className="inline-flex items-center gap-1 bg-[var(--background)] px-2 py-0.5 rounded-full border border-[var(--border)]">
              <UserCheck size={11} className="text-[var(--accent)] shrink-0" />
              <span className="truncate max-w-[150px]">
                Ajudante: <strong className="font-medium text-[var(--ink)]">{group.assistant_name}</strong>
              </span>
            </span>
          )}
        </div>
      )}
    </Card>
  );
}
