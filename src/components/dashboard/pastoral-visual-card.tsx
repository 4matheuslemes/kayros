"use client";

import { HeartHandshake, Users, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface PastoralVisualCardProps {
  dueCount: number;
  dueMembers?: Array<{ id: string; name: string }>;
  groupName?: string | null;
  className?: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "C";
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function PastoralVisualCard({
  dueCount,
  dueMembers = [],
  groupName,
  className,
}: PastoralVisualCardProps) {
  // If we have due members, display their circles, else fallback to 4 congregational circle avatars
  const circles =
    dueMembers.length > 0
      ? dueMembers.slice(0, 4)
      : [
          { id: "1", name: "Marcionil Lemes" },
          { id: "2", name: "Leandro Pieretti" },
          { id: "3", name: "Salão do Reino" },
          { id: "4", name: "Visita Pastoral" },
        ];

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        "rounded-[36px] lg:rounded-[40px]",
        "bg-[#1E3A5F] dark:bg-[#112338]",
        "p-8 lg:p-10 min-h-[300px] flex flex-col justify-between",
        "shadow-[0_16px_40px_rgba(30,58,95,0.22)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.5)]",
        className
      )}
      style={{
        backgroundImage:
          "radial-gradient(rgba(255, 255, 255, 0.16) 1.5px, transparent 1.5px)",
        backgroundSize: "20px 20px",
      }}
    >
      {/* Top row badge */}
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white/95 text-xs font-medium backdrop-blur-xs">
          <ShieldCheck size={13} className="text-[#E2C785]" />
          Cuidado Pastoral
        </span>
        <span className="text-white/70 text-xs font-medium">
          {groupName ? groupName : "Congregação"}
        </span>
      </div>

      {/* Central Visual Collage: White PersonCircles with serif initials */}
      <div className="my-auto py-6 flex items-center justify-center">
        <div className="flex items-center -space-x-3.5 sm:-space-x-4">
          {circles.map((item, idx) => (
            <div
              key={item.id}
              className={cn(
                "w-14 h-14 sm:w-16 sm:h-16 rounded-full",
                "bg-white text-[#1E3A5F]",
                "shadow-[0_8px_24px_rgba(0,0,0,0.28)]",
                "border-2 border-[#1E3A5F]/20",
                "flex items-center justify-center shrink-0",
                "font-display font-semibold text-lg sm:text-xl",
                "transition-transform hover:scale-110 hover:z-10",
                idx === 1 && "sm:-translate-y-2",
                idx === 2 && "sm:translate-y-1"
              )}
              title={item.name}
              aria-label={item.name}
            >
              {getInitials(item.name)}
            </div>
          ))}

          <div
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#B8934A] text-white shadow-[0_8px_24px_rgba(0,0,0,0.3)] border-2 border-white/40 flex items-center justify-center shrink-0 font-display font-medium text-sm sm:text-base"
            title="Mais irmãos"
          >
            <HeartHandshake size={22} />
          </div>
        </div>
      </div>

      {/* Bottom text */}
      <div className="flex items-center justify-between text-white/90 text-xs sm:text-sm font-sans pt-2 border-t border-white/10">
        <span>
          {dueCount > 0
            ? `${dueCount} ${dueCount === 1 ? "irmão" : "irmãos"} na hora de visitar`
            : "Pastoreio em dia na congregação"}
        </span>
        <span className="text-[#E2C785] font-medium">Acompanhamento ativo</span>
      </div>
    </div>
  );
}
