import { AppHeader } from "@/components/layout/app-header";
import { ArrowLeft } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex flex-col gap-4 pb-8">
      <div className="mb-2">
        <div className="inline-flex items-center gap-1.5 text-body-sm font-medium text-[var(--ink-muted)] opacity-50 pointer-events-none">
          <ArrowLeft size={16} />
          Voltar para Início
        </div>
      </div>
      
      <AppHeader
        title="Histórico de Horas"
        subtitle="Extrato completo de suas atividades"
      />

      <div className="flex flex-col gap-6 mt-4">
        <div className="flex flex-col">
          <div className="w-24 h-4 bg-[var(--surface)] animate-pulse rounded mb-3" />
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-[76px] rounded-lg bg-[var(--surface)] border border-[var(--border)] animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
