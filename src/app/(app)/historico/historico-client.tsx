"use client";

import { useDailyRecords } from "@/lib/db/hooks";
import { AppHeader } from "@/components/layout/app-header";
import { formatDuration } from "@/lib/utils";
import { ACTIVITY_CATEGORIES } from "@/lib/constants";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function HistoricoClient({ userId }: { userId: string }) {
  const { records, loading } = useDailyRecords(userId);

  // Group by month
  const grouped = records.reduce((acc, record) => {
    const month = format(parseISO(record.date), "MMMM yyyy", { locale: ptBR });
    if (!acc[month]) acc[month] = [];
    acc[month].push(record);
    return acc;
  }, {} as Record<string, typeof records>);

  return (
    <div className="flex flex-col gap-4 pb-8">
      <div className="mb-2">
        <Link href="/" className="inline-flex items-center gap-1.5 text-body-sm font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors">
          <ArrowLeft size={16} />
          Voltar para Início
        </Link>
      </div>
      
      <AppHeader
        title="Histórico de Horas"
        subtitle="Extrato completo de suas atividades"
      />

      {loading ? (
        <div className="p-8 text-center text-[var(--ink-muted)]">Carregando...</div>
      ) : records.length === 0 ? (
        <div className="p-8 text-center text-[var(--ink-muted)] border border-dashed rounded-xl m-4">
          Nenhum registro encontrado.
        </div>
      ) : (
        <div className="flex flex-col gap-6 mt-4">
          {Object.entries(grouped).map(([month, monthRecords]) => (
            <div key={month} className="flex flex-col">
              <h3 className="text-label font-bold text-[var(--primary)] uppercase tracking-wide mb-3 px-1 capitalize">
                {month}
              </h3>
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
                {monthRecords.map((record, i) => {
                  const catLabel = ACTIVITY_CATEGORIES.find(c => c.value === record.category)?.label ?? record.category;
                  const isLast = i === monthRecords.length - 1;
                  
                  return (
                    <div 
                      key={record.id} 
                      className={`flex flex-col p-4 ${!isLast ? "border-b border-[var(--border)]" : ""}`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-body font-medium text-[var(--ink)]">
                          {formatDuration(record.duration_minutes)}
                        </span>
                        <span className="text-caption text-[var(--ink-muted)] tabular-nums">
                          {format(parseISO(record.date), "dd/MM/yyyy")}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-end mt-1">
                        <span className="text-body-sm text-[var(--ink-muted)] flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                          {catLabel}
                        </span>
                        {record.source === "manual" && (
                          <span className="text-2xs bg-[var(--border)] text-[var(--ink-muted)] px-1.5 py-0.5 rounded uppercase font-bold">
                            Manual
                          </span>
                        )}
                      </div>

                      {record.notes && (
                        <p className="text-caption text-[var(--ink-muted)] mt-2 pt-2 border-t border-dashed border-[var(--border)]">
                          "{record.notes}"
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
