"use client";

import { cn } from "@/lib/utils";

interface DayOfWeekPickerProps {
  value: number[];
  onChange: (value: number[]) => void;
  maxDays?: number;
}

const DAYS = [
  { id: 1, label: "Se" },
  { id: 2, label: "Te" },
  { id: 3, label: "Qa" },
  { id: 4, label: "Qi" },
  { id: 5, label: "Se" },
  { id: 6, label: "Sá" },
  { id: 7, label: "Do" },
];

export function DayOfWeekPicker({ value, onChange, maxDays }: DayOfWeekPickerProps) {
  const toggleDay = (dayId: number) => {
    if (value.includes(dayId)) {
      onChange(value.filter((d) => d !== dayId));
    } else {
      if (maxDays && value.length >= maxDays) {
        // If they try to select more than allowed, replace the oldest selection
        // or just don't allow. Let's just ignore if max reached and they try to add.
        // Wait, replacing the oldest is a better UX if maxDays is 1.
        if (maxDays === 1) {
          onChange([dayId]);
        } else {
          // If maxDays > 1, prevent adding more.
          return;
        }
      } else {
        onChange([...value, dayId].sort());
      }
    }
  };

  return (
    <div className="flex items-center justify-between gap-1 w-full">
      {DAYS.map((day) => {
        const isSelected = value.includes(day.id);
        const disabled = !isSelected && maxDays !== 1 && maxDays !== undefined && value.length >= maxDays;
        
        return (
          <button
            key={day.id}
            type="button"
            onClick={() => toggleDay(day.id)}
            disabled={disabled}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-body-sm transition-all flex-shrink-0",
              isSelected
                ? "bg-[var(--primary)] text-white shadow-sm font-semibold"
                : "bg-[var(--surface)] border border-[var(--border)] text-[var(--ink)] hover:bg-[var(--border)]",
              disabled && !isSelected && "opacity-50 cursor-not-allowed"
            )}
          >
            {day.label}
          </button>
        );
      })}
    </div>
  );
}
