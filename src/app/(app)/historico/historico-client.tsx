"use client";

import { useDailyRecords, useMonthRecords } from "@/lib/db/hooks";
import { AppHeader } from "@/components/layout/app-header";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useState } from "react";
import { getDb, type DailyRecord } from "@/lib/db/dexie";
import type { Profile } from "@/lib/db/dexie";
import { enqueueSync } from "@/lib/db/sync";
import { EditRecordSheet } from "@/components/historico/edit-record-sheet";
import { RecordRow } from "@/components/historico/record-row";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, Field } from "@/components/ui/input";
import { ActivityBreakdownCard } from "@/components/dashboard/activity-breakdown-card";
import { ServiceYearSummary } from "@/components/historico/service-year-summary";
import Loading from "./loading";

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: format(new Date(2024, i), "MMMM", { locale: ptBR }),
}));

const YEARS = Array.from({ length: 3 }, (_, i) => {
  const y = new Date().getFullYear() - i;
  return { value: String(y), label: String(y) };
});

export function HistoricoClient({ userId, profile }: { userId: string, profile: Profile }) {
  const { records, loading, refresh } = useDailyRecords(userId);
  const [editingRecord, setEditingRecord] = useState<DailyRecord | null>(null);
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);
  const [tab, setTab] = useState("registros");

  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const { records: monthRecords, loading: loadingMonth } = useMonthRecords(userId, year, month);

  const handleDeleteRequest = (e: React.MouseEvent, recordId: string) => {
    e.stopPropagation();
    setDeletingRecordId(recordId);
  };

  const confirmDelete = async () => {
    if (!deletingRecordId) return;
    try {
      const db = getDb();
      await db.daily_records.delete(deletingRecordId);
      await enqueueSync("daily_records", deletingRecordId, "DELETE", { id: deletingRecordId });
      refresh();
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir.");
    } finally {
      setDeletingRecordId(null);
    }
  };

  // Group by day
  const groupedByDay = records.reduce((acc, record) => {
    const d = format(parseISO(record.date), "dd/MM · EEEE", { locale: ptBR });
    if (!acc[d]) acc[d] = [];
    acc[d].push(record);
    return acc;
  }, {} as Record<string, typeof records>);

  if (loading) return <Loading />;

  return (
    <div className="flex flex-col gap-4 pb-8">
      <div className="mb-2">
        <Link href="/" className="inline-flex items-center gap-1.5 text-body-sm font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors">
          <ArrowLeft size={16} />
          Voltar para Início
        </Link>
      </div>
      
      <AppHeader
        title="Histórico e Progresso"
        subtitle="Acompanhe suas atividades"
      />

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="w-full mb-4">
          <TabsTrigger value="registros" className="flex-1">Registros</TabsTrigger>
          <TabsTrigger value="mes" className="flex-1">Mês</TabsTrigger>
          <TabsTrigger value="ano" className="flex-1">Ano</TabsTrigger>
        </TabsList>

        <TabsContent value="registros" className="mt-0">
          {records.length === 0 ? (
            <div className="p-8 text-center text-[var(--ink-muted)] border border-dashed rounded-lg mt-4">
              Nenhum registro encontrado.
            </div>
          ) : (
            <div className="flex flex-col gap-6 mt-2">
              {Object.entries(groupedByDay).map(([dayLabel, dayRecords]) => (
                <div key={dayLabel} className="flex flex-col">
                  <h3 className="text-label font-bold text-[var(--primary)] uppercase tracking-wide mb-2 px-1 capitalize">
                    {dayLabel}
                  </h3>
                  <div className="flex flex-col">
                    {dayRecords.map((record) => (
                      <RecordRow
                        key={record.id}
                        record={record}
                        onClick={setEditingRecord}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="mes" className="mt-0">
          <div className="flex gap-3 mb-4">
            <Field label="Mês" htmlFor="history-month" className="flex-1">
              <Select
                id="history-month"
                options={MONTHS}
                value={String(month)}
                onChange={(e) => setMonth(Number(e.target.value))}
              />
            </Field>
            <Field label="Ano" htmlFor="history-year" className="flex-1">
              <Select
                id="history-year"
                options={YEARS}
                value={String(year)}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </Field>
          </div>
          {loadingMonth ? (
            <div className="py-8 flex justify-center">
              <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <ActivityBreakdownCard records={monthRecords} />
          )}
        </TabsContent>

        <TabsContent value="ano" className="mt-0">
          <ServiceYearSummary records={records} goalHours={profile.monthly_goal_hours} />
        </TabsContent>
      </Tabs>

      <EditRecordSheet
        open={!!editingRecord}
        onClose={() => setEditingRecord(null)}
        record={editingRecord}
        onSaved={refresh}
        onDeleteRequest={setDeletingRecordId}
      />

      <Drawer
        open={!!deletingRecordId}
        onClose={() => setDeletingRecordId(null)}
        title="Excluir registro"
        description="Esta ação não pode ser desfeita. Tem certeza que deseja apagar este relatório de horas?"
      >
        <div className="flex flex-col gap-3 mt-4">
          <Button onClick={confirmDelete} variant="destructive" className="w-full" size="lg">
            <Trash2 className="mr-2 h-4 w-4" />
            Sim, excluir registro
          </Button>
          <Button onClick={() => setDeletingRecordId(null)} variant="secondary" className="w-full" size="lg">
            Cancelar
          </Button>
        </div>
      </Drawer>
    </div>
  );
}
