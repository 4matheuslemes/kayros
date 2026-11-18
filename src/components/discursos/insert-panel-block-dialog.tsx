"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { PanelRight } from "lucide-react";

interface InsertPanelBlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: { label: string; optional: boolean }) => void;
}

export function InsertPanelBlockDialog({
  open,
  onOpenChange,
  onConfirm,
}: InsertPanelBlockDialogProps) {
  const [label, setLabel] = useState("");
  const [optional, setOptional] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Limpa os campos sempre que o diálogo for aberto
  useEffect(() => {
    if (open) {
      setLabel("");
      setOptional(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [open]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = label.trim();
    if (!trimmed) return;

    onConfirm({
      label: trimmed,
      optional,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <div className="flex items-center gap-2 text-[var(--accent)] mb-1">
              <PanelRight size={20} />
              <DialogTitle className="text-lg font-semibold text-[var(--ink)]">
                Bloco no painel lateral
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-[var(--ink-muted)] leading-relaxed">
              Crie um chip que abre o conteúdo no painel lateral sem poluir o
              roteiro. Ideal para anúncios, visão da próxima reunião ou notas de tempo.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-1">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="panel-block-label-input"
                className="text-xs font-medium text-[var(--ink)]"
              >
                Nome do bloco
              </label>
              <Input
                ref={inputRef}
                id="panel-block-label-input"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Ex.: Anúncios, Próxima reunião, Comentários..."
                className="h-9 text-sm"
                autoComplete="off"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-[var(--border)]">
              <div className="flex flex-col">
                <label
                  htmlFor="panel-block-optional-switch"
                  className="text-xs font-medium text-[var(--ink)] cursor-pointer"
                >
                  Opcional (se houver tempo)
                </label>
                <span className="text-[11px] text-[var(--ink-muted)]">
                  Exibe borda tracejada e aviso de tempo no chip
                </span>
              </div>
              <Switch
                id="panel-block-optional-switch"
                checked={optional}
                onCheckedChange={setOptional}
                aria-label="Opcional se houver tempo"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!label.trim()}
              className="gap-1.5"
            >
              Inserir bloco
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
