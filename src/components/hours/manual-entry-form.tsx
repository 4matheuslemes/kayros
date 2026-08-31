"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field, Select } from "@/components/ui/input";
import { ACTIVITY_CATEGORIES, type ActivityCategory } from "@/lib/constants";
import { getDb } from "@/lib/db/dexie";
import { enqueueSync } from "@/lib/db/sync";

const schema = z.object({
  hours:    z.coerce.number().int().min(0).max(23),
  minutes:  z.coerce.number().int().min(0).max(59),
  date:     z.string().min(1, "Escolha uma data"),
  category: z.string().min(1),
  notes:    z.string().optional(),
}).refine((d) => d.hours > 0 || d.minutes > 0, {
  message: "Informe pelo menos 1 minuto",
  path: ["minutes"],
});

type FormData = z.infer<typeof schema>;

interface ManualEntryFormProps {
  userId: string;
  onSaved?: () => void;
}

export function ManualEntryForm({ userId, onSaved }: ManualEntryFormProps) {
  const [saving, setSaving] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { date: today, category: "convencional", hours: 0, minutes: 0 },
  });

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    const db = getDb();
    const now = new Date().toISOString();
    const record = {
      id: uuidv4(),
      user_id: userId,
      date: data.date,
      duration_minutes: data.hours * 60 + data.minutes,
      category: data.category as ActivityCategory,
      source: "manual" as const,
      notes: data.notes ?? "",
      created_at: now,
      updated_at: now,
      synced: false,
    };

    try {
      await db.daily_records.add(record);
      await enqueueSync("daily_records", record.id, "INSERT", record);
      toast.success("Horas registradas com sucesso");
      reset({ date: today, category: "convencional", hours: 0, minutes: 0 });
      onSaved?.();
    } catch (err) {
      toast.error("Erro ao salvar. Tente novamente.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      {/* Duration row */}
      <div className="flex gap-3">
        <Field label="Horas" htmlFor="manual-hours" className="flex-1">
          <Input
            id="manual-hours"
            type="number"
            inputMode="numeric"
            min={0}
            max={23}
            placeholder="0"
            error={!!errors.hours}
            {...register("hours")}
          />
        </Field>
        <Field label="Minutos" htmlFor="manual-minutes" className="flex-1" error={errors.minutes?.message}>
          <Input
            id="manual-minutes"
            type="number"
            inputMode="numeric"
            min={0}
            max={59}
            placeholder="0"
            error={!!errors.minutes}
            {...register("minutes")}
          />
        </Field>
      </div>

      <Field label="Data" htmlFor="manual-date" error={errors.date?.message}>
        <Input
          id="manual-date"
          type="date"
          max={today}
          error={!!errors.date}
          {...register("date")}
        />
      </Field>

      <Field label="Tipo de atividade" htmlFor="manual-category">
        <Select
          id="manual-category"
          options={ACTIVITY_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
          {...register("category")}
        />
      </Field>

      <Field label="Notas" htmlFor="manual-notes" hint="Opcional">
        <Textarea
          id="manual-notes"
          placeholder="O que aconteceu hoje?"
          rows={3}
          {...register("notes")}
        />
      </Field>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        loading={saving}
        className="w-full mt-1"
      >
        Registrar horas
      </Button>
    </form>
  );
}
