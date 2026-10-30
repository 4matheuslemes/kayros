"use client";

import { HeartHandshake } from "lucide-react";
import { cn } from "@/lib/utils";

interface PastoralVisualCardProps {
  /** Texto estático curto, ex.: "Última visita: Luzanete (há 2 dias)". */
  lastVisitLabel?: string;
  className?: string;
}

/**
 * Banner editorial puramente decorativo (sem elementos interativos).
 */
export function PastoralVisualCard({ lastVisitLabel, className }: PastoralVisualCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden",
        "rounded-[36px] lg:rounded-[40px]",
        "bg-[#1E3A5F] dark:bg-[#112338]",
        "p-8 lg:p-10 min-h-[300px] flex flex-col justify-between",
        "shadow-[0_16px_40px_rgba(30,58,95,0.22)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.5)]",
        "select-none",
        className
      )}
      style={{
        backgroundImage:
          "radial-gradient(rgba(255, 255, 255, 0.16) 1.5px, transparent 1.5px)",
        backgroundSize: "20px 20px",
      }}
      role="presentation"
    >
      {/* Arte decorativa: marca d'água à direita */}
      <HeartHandshake
        aria-hidden="true"
        strokeWidth={1.25}
        className="pointer-events-none absolute -right-4 top-1/2 -translate-y-1/2 -rotate-12 size-32 sm:size-40 text-white/10"
      />

      {/* Lado esquerdo: textos */}
      <span className="relative text-[10px] uppercase tracking-widest text-white/50">
        Ministério Congregacional
      </span>

      <div className="relative my-auto py-6 max-w-[75%]">
        <h2 className="font-display text-3xl sm:text-4xl text-white">
          Cuidado Pastoral
        </h2>
        <p className="mt-3 text-sm text-white/70 italic">
          Pastoreiem o rebanho de Deus que está aos seus cuidados.
        </p>
      </div>

      {lastVisitLabel && (
        <span className="relative text-xs text-white/60">{lastVisitLabel}</span>
      )}
    </div>
  );
}
