"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Check, ArrowRightLeft, Users, UserMinus } from "lucide-react";
import type {
  ServiceGroup,
  CongregationMember,
} from "@/lib/types/congregation";

interface TransferMemberDialogProps {
  open: boolean;
  onClose: () => void;
  member: CongregationMember | null;
  groups: ServiceGroup[];
  onTransferred: (memberId: string, newGroupId: string | null) => void;
}

export function TransferMemberDialog({
  open,
  onClose,
  member,
  groups,
  onTransferred,
}: TransferMemberDialogProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  if (!member) return null;

  const currentGroupId = member.group_id;

  const handleSelectGroup = async (targetGroupId: string | null) => {
    if (targetGroupId === currentGroupId) return;

    setLoadingId(targetGroupId || "none");
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from("congregation_members")
        .update({
          group_id: targetGroupId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", member.id);

      if (error) throw error;

      if (targetGroupId) {
        const gName = groups.find((g) => g.id === targetGroupId)?.name || "grupo";
        toast.success(`Irmão alocado em ${gName}`);
      } else {
        toast.success("Irmão removido do grupo (agora em Sem grupo)");
      }

      onTransferred(member.id, targetGroupId);
      onClose();
    } catch (err) {
      console.error("Error transferring member to group:", err);
      toast.error("Erro ao alterar grupo do irmão.");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md p-5">
        <DialogHeader>
          <div className="w-10 h-10 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center mb-1 mx-auto">
            <ArrowRightLeft size={20} />
          </div>
          <DialogTitle className="text-center">
            {currentGroupId ? "Transferir de grupo" : "Alocar em grupo"}
          </DialogTitle>
          <DialogDescription className="text-center text-body-sm text-[var(--ink-muted)]">
            Escolha o grupo de serviço para <strong className="text-[var(--ink)]">{member.full_name}</strong>:
          </DialogDescription>
        </DialogHeader>

        {/* Lista de Grupos */}
        <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto py-1">
          {groups.map((g) => {
            const isCurrent = g.id === currentGroupId;
            const isLoading = loadingId === g.id;

            return (
              <button
                key={g.id}
                type="button"
                disabled={isCurrent || !!loadingId}
                onClick={() => handleSelectGroup(g.id)}
                className={`w-full text-left p-3 rounded-lg border font-sans flex items-center justify-between transition-colors ${
                  isCurrent
                    ? "bg-[var(--primary)]/10 border-[var(--primary)]/30 text-[var(--primary)] cursor-default"
                    : "bg-[var(--surface)] border-[var(--border)] hover:border-[var(--primary)] text-[var(--ink)] cursor-pointer"
                }`}
              >
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="font-semibold text-body-sm truncate">
                    {g.sort_order}. {g.name}
                  </span>
                  <span className="text-2xs text-[var(--ink-muted)] truncate">
                    {g.meeting_info}
                  </span>
                </div>

                <div className="shrink-0 flex items-center gap-1.5">
                  {isCurrent && (
                    <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-[var(--primary)] text-white flex items-center gap-1">
                      <Check size={12} />
                      Atual
                    </span>
                  )}
                  {isLoading && (
                    <div className="w-4 h-4 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
              </button>
            );
          })}

          {/* Opção para deixar sem grupo (se já tiver um grupo) */}
          {currentGroupId && (
            <button
              type="button"
              disabled={!!loadingId}
              onClick={() => handleSelectGroup(null)}
              className="w-full text-left p-3 rounded-lg border border-dashed border-[var(--border)] hover:border-red-400 bg-[var(--background)]/60 text-[var(--ink-muted)] hover:text-red-600 transition-colors flex items-center justify-between cursor-pointer mt-1"
            >
              <div className="flex items-center gap-2">
                <UserMinus size={16} className="shrink-0" />
                <span className="text-body-sm font-medium">Remover do grupo (Sem grupo)</span>
              </div>
              {loadingId === "none" && (
                <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
              )}
            </button>
          )}
        </div>

        <div className="pt-2 flex justify-end">
          <Button variant="ghost" onClick={onClose} disabled={!!loadingId} className="w-full">
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
