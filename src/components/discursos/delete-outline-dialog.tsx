"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeleteOutlineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outlineTitle?: string;
  onConfirm: () => void;
  loading?: boolean;
}

export function DeleteOutlineDialog({
  open,
  onOpenChange,
  outlineTitle,
  onConfirm,
  loading = false,
}: DeleteOutlineDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir esboço?</DialogTitle>
          <DialogDescription>
            {outlineTitle ? (
              <>
                Tem certeza que deseja excluir <strong>&ldquo;{outlineTitle}&rdquo;</strong>?
                Esta ação não pode ser desfeita.
              </>
            ) : (
              "Tem certeza que deseja excluir este esboço? Esta ação não pode ser desfeita."
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            loading={loading}
          >
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
