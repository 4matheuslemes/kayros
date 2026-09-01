"use client";

import { Clock, Users, BookOpen, ArrowRight, Calendar } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { formatDuration } from "@/lib/utils";

interface MonthSummaryCardProps {
  totalMinutes: number;
  revisitas: number;
  estudosAtivos: number;
}

function StatItem({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1 flex-1">
      <div
        className={`p-2.5 rounded-xl ${
          accent
            ? "bg-[var(--success)]/15 text-[var(--success)]"
            : "bg-[var(--primary)]/8 text-[var(--primary)]"
        }`}
      >
        <Icon size={18} />
      </div>
      <span className="font-display font-semibold text-lg text-[var(--ink)] leading-none">
        {value}
      </span>
      <span className="text-caption text-[var(--ink-muted)] text-center leading-tight">
        {label}
      </span>
    </div>
  );
}

export function MonthSummaryCard({
  totalMinutes,
  revisitas,
  estudosAtivos,
}: MonthSummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar size={18} className="text-[var(--primary)]" />
          Resumo do mês
        </CardTitle>
      </CardHeader>
      <div className="flex gap-2">
        <StatItem
          icon={Clock}
          label="Horas"
          value={formatDuration(totalMinutes)}
        />
        <div className="w-px bg-[var(--border)]" />
        <StatItem
          icon={Users}
          label="Revisitas"
          value={String(revisitas)}
        />
        <div className="w-px bg-[var(--border)]" />
        <StatItem
          icon={BookOpen}
          label="Estudos ativos"
          value={String(estudosAtivos)}
          accent
        />
      </div>
      <div className="mt-4 pt-4 border-t border-[var(--border)]">
        <Link 
          href="/historico" 
          className="flex items-center justify-between w-full text-body-sm font-medium text-[var(--primary)] hover:text-[var(--primary-dark)] transition-colors"
        >
          <span>Ver extrato completo</span>
          <ArrowRight size={16} />
        </Link>
      </div>
    </Card>
  );
}
