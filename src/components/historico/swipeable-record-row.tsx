"use client";

import { useState, useRef } from "react";
import { formatDuration } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { Trash2, Edit2 } from "lucide-react";
import { ACTIVITY_CATEGORIES } from "@/lib/constants";
import type { DailyRecord } from "@/lib/db/dexie";
import { cn } from "@/lib/utils";

interface SwipeableRecordRowProps {
  record: DailyRecord;
  onEdit: (record: DailyRecord) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
}

export function SwipeableRecordRow({ record, onEdit, onDelete }: SwipeableRecordRowProps) {
  const [offset, setOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startX = useRef<number | null>(null);
  const currentX = useRef<number | null>(null);

  const maxOffset = -120; // width of the two buttons

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startX.current === null) return;
    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;

    // Only allow swiping left
    if (diff < 0) {
      setOffset(Math.max(diff, maxOffset));
    } else {
      setOffset(0);
    }
  };

  const handleTouchEnd = () => {
    if (startX.current !== null && currentX.current !== null) {
      const diff = currentX.current - startX.current;
      // If swiped more than half the maxOffset, snap open
      if (diff < maxOffset / 2) {
        setOffset(maxOffset);
      } else {
        setOffset(0);
      }
    }
    setIsSwiping(false);
    startX.current = null;
    currentX.current = null;
  };

  const catLabel = ACTIVITY_CATEGORIES.find((c) => c.value === record.category)?.label ?? record.category;

  return (
    <div className="relative">
      {/* Background Actions Layer */}
      <div className="absolute inset-y-0 right-0 flex items-center justify-end gap-2 pr-1">
        <button
          onClick={() => {
            setOffset(0);
            onEdit(record);
          }}
          className="w-12 h-12 rounded-full flex items-center justify-center bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)] transition-colors shadow-sm"
          aria-label="Editar"
        >
          <Edit2 size={18} />
        </button>
        <button
          onClick={(e) => {
            setOffset(0);
            onDelete(e, record.id);
          }}
          className="w-12 h-12 rounded-full flex items-center justify-center bg-red-500 text-white hover:bg-red-600 transition-colors shadow-sm"
          aria-label="Excluir"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Foreground Content Layer */}
      <div
        className="relative flex flex-col p-4 bg-[var(--surface)] w-full border border-[var(--border)] rounded-lg shadow-sm transition-transform"
        style={{
          transform: `translateX(${offset}px)`,
          transitionDuration: isSwiping ? "0ms" : "300ms",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex justify-between items-start mb-1">
          <span className="text-body font-medium text-[var(--ink)]">
            {formatDuration(record.duration_minutes)}
          </span>
          <span className="text-caption text-[var(--ink-muted)] tabular-nums">
            {format(parseISO(record.date), "dd/MM/yyyy")}
          </span>
        </div>

        <div className="flex items-center gap-4 mt-1">
          <span className="text-body-sm text-[var(--ink-muted)] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
            <span className="capitalize">{catLabel}</span>
          </span>
          
          {record.source === "manual" && (
            <span className="text-body-sm text-[var(--ink-muted)] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--ink-muted)] opacity-50" />
              <span>Manual</span>
            </span>
          )}
        </div>

        {record.notes && (
          <p className="text-caption text-[var(--ink-muted)] mt-2 pt-2 border-t border-dashed border-[var(--border)]">
            "{record.notes}"
          </p>
        )}
      </div>
    </div>
  );
}
