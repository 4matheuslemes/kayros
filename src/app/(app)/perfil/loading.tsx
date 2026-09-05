import { Card } from "@/components/ui/card";
import { User } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex flex-col gap-5">
      {/* Header placeholder — no title text to flash */}
      <div className="h-[72px]" />

      <Card>
        <div className="flex items-center gap-2 mb-5">
          <User size={16} className="text-[var(--primary)]" />
          <h2 className="text-subheading text-[var(--ink)]">Perfil</h2>
        </div>

        <div className="flex flex-col gap-5">
          {/* Fields */}
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="w-32 h-4 bg-[var(--surface)] rounded animate-pulse" />
              <div className="w-full h-11 bg-[var(--surface)] rounded-md animate-pulse border border-[var(--border)]" />
            </div>
          ))}

          {/* Schedule */}
          <div className="pt-4 mt-2 border-t border-[var(--border)] flex flex-col gap-1.5">
            <div className="w-24 h-4 bg-[var(--surface)] rounded animate-pulse" />
            <div className="flex justify-between items-center gap-1">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="w-10 h-10 rounded-full bg-[var(--surface)] border border-[var(--border)] animate-pulse" />
              ))}
            </div>
          </div>

          <div className="w-full h-12 bg-[var(--surface)] border border-[var(--border)] rounded-md animate-pulse mt-2" />
        </div>
      </Card>
    </div>
  );
}
