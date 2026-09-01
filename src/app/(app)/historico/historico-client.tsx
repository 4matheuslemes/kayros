"use client";

import { useDailyRecords } from "@/lib/db/hooks";
import { AppHeader } from "@/components/layout/app-header";
import { formatDuration } from "@/lib/utils";
import { ACTIVITY_CATEGORIES } from "@/lib/constants";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useState } from "react";
import { getDb, type DailyRecord } from "@/lib/db/dexie";
import { enqueueSync } from "@/lib/db/sync";
import { EditRecordSheet } from "@/components/historico/edit-record-sheet";
import { SwipeableRecordRow } from "@/components/historico/swipeable-record-row";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

export function HistoricoClient({ userId }: { userId: string }) {
  const { records, loading, refresh } = useDailyRecords(userId);
  const [editingRecord, setEditingRecord] = useState<DailyRecord | null>(null);
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);

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
                {monthRecords.map((record, i) => (
                  <SwipeableRecordRow
                    key={record.id}
                    record={record}
                    isLast={i === monthRecords.length - 1}
                    onEdit={setEditingRecord}
                    onDelete={handleDeleteRequest}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <EditRecordSheet
        open={!!editingRecord}
        onClose={() => setEditingRecord(null)}
        record={editingRecord}
        onSaved={refresh}
      />

      <Drawer
        open={!!deletingRecordId}
        onClose={() => setDeletingRecordId(null)}
        title="Excluir registro"
        description="Esta ação não pode ser desfeita. Tem certeza que deseja apagar este relatório de horas?"
      >
        <div className="flex flex-col gap-3 mt-4">
          <Button
            onClick={confirmDelete}
            variant="destructive"
            className="w-full"
            size="lg"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Sim, excluir registro
          </Button>
          <Button
            onClick={() => setDeletingRecordId(null)}
            variant="secondary"
            className="w-full"
            size="lg"
          >
            Cancelar
          </Button>
        </div>
      </Drawer>
    </div>
  );
}
