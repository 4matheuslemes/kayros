"use client";

import { formatDuration } from "@/lib/utils";
import { ACTIVITY_CATEGORIES, ACTIVITY_COLORS } from "@/lib/constants";
import type { DailyRecord } from "@/lib/db/dexie";
import { Clock, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecordRowProps {
  record: DailyRecord;
  onClick: (record: DailyRecord) => void;
}

export function RecordRow({ record, onClick }: RecordRowProps) {
  const catLabel = ACTIVITY_CATEGORIES.find((c) => c.value === record.category)?.label ?? record.category;
  const dotColor = ACTIVITY_COLORS[record.category] || "bg-[var(--accent)]";

  return (
    <button
      onClick={() => onClick(record)}
      className="w-full flex items-center justify-between py-3 px-1 border-t border-[var(--border)] first:border-t-0 active:bg-[var(--background)] transition-colors text-left"
    >
      <div className="flex items-center gap-2">
        <span className={cn("w-2 h-2 rounded-full", dotColor)} />
        <span className="text-body-sm text-[var(--ink)] font-medium capitalize">
          {catLabel}
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        <span className="text-body-sm font-sans font-semibold text-[var(--ink)] tabular-nums">
          {formatDuration(record.duration_minutes)}
        </span>
        {record.source === "timer" ? (
          <Clock size={15} className="text-[var(--ink-muted)]" />
        ) : (
          <Pencil size={15} className="text-[var(--ink-muted)]" />
        )}
      </div>
    </button>
  );
}
