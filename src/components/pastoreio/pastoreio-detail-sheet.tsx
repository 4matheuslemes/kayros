"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Users, CalendarClock, Pencil, Trash2, AlertTriangle, UserCheck, Shield } from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import type { ShepherdingVisit } from "@/lib/types/pastoreio";

interface PastoreioDetailSheetProps {
  visit: ShepherdingVisit | null;
  open: boolean;
  onClose: () => void;
  onEdit: (visit: ShepherdingVisit) => void;
  onDelete: (visitId: string) => Promise<void>;
  visitedNames?: string[];
  linkedCompanionName?: string | null;
  currentUserId?: string;
}

export function PastoreioDetailSheet({
  visit,
  open,
  onClose,
  onEdit,
  onDelete,
  visitedNames,
  linkedCompanionName,
  currentUserId,
}: PastoreioDetailSheetProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!visit) return null;

  const displayNames = visitedNames && visitedNames.length > 0 ? visitedNames : [visit.family_or_person];
  const drawerTitle = displayNames.join(", ");
  const displayCompanion = linkedCompanionName || visit.companion;
  const isAuthor = !currentUserId || visit.user_id === currentUserId;

  const formattedDate = (() => {
    try {
      return format(parseISO(visit.visit_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return visit.visit_date;
    }
  })();

  const formattedNextDate = (() => {
    if (!visit.next_visit_date) return null;
    try {
      return format(parseISO(visit.next_visit_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return visit.next_visit_date;
    }
  })();

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(visit.id);
      setConfirmDelete(false);
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  const handleClose = () => {
    setConfirmDelete(false);
    onClose();
  };

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      title={drawerTitle}
      description="Visita de pastoreio registrada"
    >
      <div className="flex flex-col gap-5 mt-2">
        {/* Metadados da visita */}
        <div className="flex flex-col gap-3 bg-[var(--background)]/60 border border-[var(--border)] rounded-lg p-3.5">
          {/* Pessoas visitadas como chips */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-caption font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
              <Users size={14} className="text-[var(--primary)] shrink-0" />
              <span>Quem foi visitado</span>
            </div>
            <div className="flex flex-wrap gap-1.5 pl-0.5 pt-0.5">
              {displayNames.map((name, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>

          <div className="h-px bg-[var(--border)]/60 my-0.5" />

          {/* Realizada por (Autoria) */}
          <div className="flex items-center gap-2 text-body-sm text-[var(--ink)]">
            <Shield size={15} className="text-[var(--primary)] shrink-0" />
            <span className="font-medium">Realizada por:</span>
            <span>{visit.created_by_name || "Ancião"}</span>
          </div>

          <div className="flex items-center gap-2 text-body-sm text-[var(--ink)]">
            <Calendar size={15} className="text-[var(--primary)] shrink-0" />
            <span className="font-medium">Data:</span>
            <span>{formattedDate}</span>
          </div>

          {displayCompanion && (
            <div className="flex items-center gap-2 text-body-sm text-[var(--ink)]">
              <UserCheck size={15} className="text-[var(--ink-muted)] shrink-0" />
              <span className="font-medium">Acompanhado por:</span>
              <span>{displayCompanion}</span>
            </div>
          )}

          {formattedNextDate && (
            <div className="flex items-center gap-2 text-body-sm text-[var(--primary)]">
              <CalendarClock size={15} className="shrink-0" />
              <span className="font-medium">Próxima visita:</span>
              <span>{formattedNextDate}</span>
            </div>
          )}
        </div>

        {/* Relatório */}
        <div className="flex flex-col gap-2">
          <h4 className="text-caption font-semibold uppercase tracking-wider text-[var(--ink-muted)] px-1">
            Relatório da Visita
          </h4>
          {visit.report ? (
            <div className="p-4 rounded-lg bg-[var(--background)] border border-[var(--border)] text-body-sm text-[var(--ink)] whitespace-pre-wrap leading-relaxed select-text max-h-[300px] overflow-y-auto">
              {visit.report}
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-[var(--background)] border border-[var(--border)] text-caption text-[var(--ink-muted)] italic text-center">
              Nenhum relatório detalhado foi inserido nesta visita.
            </div>
          )}
        </div>

        {/* Confirmação de exclusão ou botões de ação ou modo somente leitura */}
        {!isAuthor ? (
          <div className="pt-2 text-center text-xs text-[var(--ink-muted)] bg-[var(--background)]/40 p-2.5 rounded-lg border border-[var(--border)]">
            Visita registrada por {visit.created_by_name || "outro irmão"} (somente leitura)
          </div>
        ) : confirmDelete ? (
          <div className="flex flex-col gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg animate-in fade-in duration-150">
            <div className="flex items-start gap-2.5 text-body-sm text-red-600 dark:text-red-400">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <span>
                Tem certeza que deseja excluir esta visita de pastoreio? Esta ação não pode ser desfeita.
              </span>
            </div>
            <div className="flex gap-2.5 mt-1">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1"
                disabled={deleting}
                onClick={() => setConfirmDelete(false)}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                loading={deleting}
                onClick={handleDelete}
              >
                Excluir
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                onClose();
                onEdit(visit);
              }}
            >
              <Pencil size={15} className="mr-1.5 text-[var(--ink-muted)]" />
              Editar
            </Button>
            <Button
              variant="ghost"
              className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 size={15} className="mr-1.5" />
              Excluir
            </Button>
          </div>
        )}
      </div>
    </Drawer>
  );
}
