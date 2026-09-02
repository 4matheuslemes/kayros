"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CalendarDays, LayoutDashboard } from "lucide-react";
import Image from "next/image";

export function ReleaseNotesModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const hasSeen = localStorage.getItem("kairos_release_v1_1_seen");
    if (!hasSeen) {
      const timer = setTimeout(() => setOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem("kairos_release_v1_1_seen", "true");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose();
    }}>
      <DialogContent className="sm:max-w-[420px] bg-[var(--surface)] border-[var(--border)] overflow-hidden rounded-3xl p-6 sm:p-8 shadow-2xl">
        
        <DialogHeader className="flex flex-col items-center text-center space-y-2 mb-8">
          <div className="flex items-center justify-center mb-2">
            <Image
              src="/kairos-mark-transparent.svg"
              alt="Kairós"
              width={64}
              height={64}
              priority
            />
          </div>
          <DialogTitle className="text-[22px] font-display font-medium text-[var(--ink)] tracking-tight">
            O que há de novo
          </DialogTitle>
          <DialogDescription className="text-sm text-[var(--ink-muted)] leading-relaxed px-4">
            O Kairós foi atualizado para simplificar ainda mais o seu planejamento.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 px-1">
          <div className="flex gap-4">
            <div className="mt-0.5">
              <CalendarDays className="text-[var(--ink)]" size={20} strokeWidth={1.5} />
            </div>
            <div>
              <h4 className="text-[15px] font-medium text-[var(--ink)] mb-1.5 tracking-tight">Planejador de Agenda</h4>
              <p className="text-[13px] text-[var(--ink-muted)] leading-relaxed">
                Defina sua carga horária exata para cada dia da semana e acompanhe a projeção da sua meta em tempo real.
              </p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="mt-0.5">
              <LayoutDashboard className="text-[var(--ink)]" size={20} strokeWidth={1.5} />
            </div>
            <div>
              <h4 className="text-[15px] font-medium text-[var(--ink)] mb-1.5 tracking-tight">Dashboard Inteligente</h4>
              <p className="text-[13px] text-[var(--ink-muted)] leading-relaxed">
                Um novo widget minimalista que exibe seus alvos diários e compromissos semanais sem poluição visual.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-10 sm:justify-center w-full">
          <Button 
            onClick={handleClose} 
            className="w-full h-12 rounded-full font-medium text-[15px] transition-transform active:scale-[0.98]"
          >
            Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
