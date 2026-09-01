import { AppHeader } from "@/components/layout/app-header";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="flex flex-col gap-4 pb-8">
      <div className="mb-2">
        <div className="inline-flex items-center gap-1.5 text-body-sm font-medium text-[var(--ink-muted)] opacity-50 pointer-events-none">
          <ArrowLeft size={16} />
          Voltar para Perfil
        </div>
      </div>
      
      <AppHeader
        title="Relatório do Mês"
        subtitle="Resumo das suas atividades"
      />

      <Card className="flex flex-col gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex justify-between items-center py-2 border-b border-[var(--border)] last:border-0">
            <div className="w-32 h-4 bg-[var(--surface)] rounded animate-pulse" />
            <div className="w-16 h-6 bg-[var(--surface)] rounded animate-pulse" />
          </div>
        ))}
      </Card>
      
      <div className="w-full h-12 bg-[var(--surface)] border border-[var(--border)] rounded-md animate-pulse mt-4" />
    </div>
  );
}
