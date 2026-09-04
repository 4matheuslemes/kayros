"use client";

import { useEffect } from "react";
import { UseFormRegister, UseFormWatch, UseFormSetValue } from "react-hook-form";
import { Field, Select, Input } from "@/components/ui/input";
import { DayOfWeekPicker } from "@/components/ui/day-of-week-picker";
import { STUDY_BOOKS, getNextUnit } from "@/lib/study-books";
import type { ContactFormData } from "./contact-form";

interface StudyProgressFieldProps {
  register: UseFormRegister<ContactFormData>;
  watch: UseFormWatch<ContactFormData>;
  setValue: UseFormSetValue<ContactFormData>;
  errors: any;
}

export function StudyProgressField({ register, watch, setValue, errors }: StudyProgressFieldProps) {
  const bookId = watch("study_book_id");
  const unitId = watch("study_current_unit_id");
  const freq = watch("study_frequency");
  const days = watch("study_days") || [];

  // When book changes, or if it's not set, default to first book
  useEffect(() => {
    if (!bookId && STUDY_BOOKS.length > 0) {
      setValue("study_book_id", STUDY_BOOKS[0].id);
    }
  }, [bookId, setValue]);

  // When frequency changes, truncate days if needed
  useEffect(() => {
    if (freq && days.length > freq) {
      setValue("study_days", days.slice(0, freq));
    }
  }, [freq, days, setValue]);

  const selectedBook = STUDY_BOOKS.find((b) => b.id === bookId) || STUDY_BOOKS[0];
  const nextUnit = selectedBook ? getNextUnit(selectedBook.id, unitId ?? null) : null;

  // Group units by part
  const unitGroups = selectedBook?.units.reduce((acc, unit) => {
    const groupLabel = `Parte ${unit.part}`;
    const group = acc.find(g => g.label === groupLabel);
    if (group) {
      group.options.push({ value: unit.id, label: unit.label });
    } else {
      acc.push({ label: groupLabel, options: [{ value: unit.id, label: unit.label }] });
    }
    return acc;
  }, [] as { label: string; options: { value: string; label: string }[] }[]) || [];

  return (
    <div className="flex flex-col gap-4 p-4 mt-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
      <h3 className="text-subheading text-[var(--ink)] mb-1">Progresso do Estudo</h3>
      
      <Field label="Publicação" htmlFor="study_book_id" error={errors.study_book_id?.message}>
        <Select
          id="study_book_id"
          options={STUDY_BOOKS.map(b => ({ value: b.id, label: b.title }))}
          {...register("study_book_id")}
        />
      </Field>

      <Field label="Lição atual" htmlFor="study_current_unit_id" error={errors.study_current_unit_id?.message}>
        <Select
          id="study_current_unit_id"
          placeholder="Selecione a lição"
          groups={unitGroups}
          {...register("study_current_unit_id")}
        />
        {nextUnit ? (
          <p className="text-caption text-[var(--ink-muted)] mt-1 ml-1">
            Próxima: {nextUnit.label}
          </p>
        ) : unitId ? (
          <p className="text-caption text-[var(--success)] mt-1 ml-1 font-medium">
            Livro concluído! 🎉
          </p>
        ) : null}
      </Field>

      <Field label="Frequência" error={errors.study_frequency?.message}>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setValue("study_frequency", 1)}
            className={`flex-1 py-2 text-body-sm rounded-lg border transition-colors ${
              freq === 1 
                ? "bg-[var(--primary)] border-[var(--primary)] text-white font-semibold" 
                : "bg-transparent border-[var(--border)] text-[var(--ink-muted)] hover:text-[var(--ink)]"
            }`}
          >
            1x por semana
          </button>
          <button
            type="button"
            onClick={() => setValue("study_frequency", 2)}
            className={`flex-1 py-2 text-body-sm rounded-lg border transition-colors ${
              freq === 2 
                ? "bg-[var(--primary)] border-[var(--primary)] text-white font-semibold" 
                : "bg-transparent border-[var(--border)] text-[var(--ink-muted)] hover:text-[var(--ink)]"
            }`}
          >
            2x por semana
          </button>
        </div>
      </Field>

      <Field label="Dias do estudo" error={errors.study_days?.message}>
        <DayOfWeekPicker
          value={days}
          onChange={(val) => setValue("study_days", val)}
          maxDays={freq || 1}
        />
        <div className="mt-4">
          <Field label="Horário do estudo" htmlFor="study-time">
            <Input
              id="study-time"
              type="time"
              {...register("study_time")}
            />
          </Field>
        </div>
      </Field>
    </div>
  );
}
