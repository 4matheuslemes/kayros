"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field, Select } from "@/components/ui/input";
import { ACTIVITY_CATEGORIES, type ActivityCategory } from "@/lib/constants";
import { getDb, type DailyRecord } from "@/lib/db/dexie";
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

interface EditRecordSheetProps {
  open: boolean;
  onClose: () => void;
  record: DailyRecord | null;
  onSaved?: () => void;
  onDeleteRequest?: (id: string) => void;
}

export function EditRecordSheet({
  open,
  onClose,
  record,
  onSaved,
  onDeleteRequest,
}: EditRecordSheetProps) {
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (record && open) {
      reset({
        hours: Math.floor(record.duration_minutes / 60),
        minutes: record.duration_minutes % 60,
        date: record.date,
        category: record.category,
        notes: record.notes ?? "",
      });
    }
  }, [record, open, reset]);

  const onSubmit = async (data: FormData) => {
    if (!record) return;
    setSaving(true);
    const db = getDb();
    
    const updatedRecord = {
      ...record,
      date: data.date,
      duration_minutes: data.hours * 60 + data.minutes,
      category: data.category as ActivityCategory,
      notes: data.notes ?? "",
      updated_at: new Date().toISOString(),
      synced: false,
    };

    try {
      await db.daily_records.put(updatedRecord);
      await enqueueSync("daily_records", record.id, "UPDATE", updatedRecord);
      toast.success("Registro atualizado com sucesso");
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error("Erro ao salvar. Tente novamente.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!record) return null;

  const today = new Date().toISOString().split("T")[0];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Editar registro"
      description="Faça as correções necessárias no seu relatório."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 mt-2" noValidate>
        {/* Duration row */}
        <div className="flex gap-3">
          <Field label="Horas" htmlFor="edit-hours" className="flex-1">
            <Input
              id="edit-hours"
              type="number"
              inputMode="numeric"
              min={0}
              max={23}
              placeholder="0"
              error={!!errors.hours}
              {...register("hours")}
            />
          </Field>
          <Field label="Minutos" htmlFor="edit-minutes" className="flex-1" error={errors.minutes?.message}>
            <Input
              id="edit-minutes"
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

        <Field label="Data" htmlFor="edit-date" error={errors.date?.message}>
          <Input
            id="edit-date"
            type="date"
            max={today}
            error={!!errors.date}
            {...register("date")}
          />
        </Field>

        <Field label="Tipo de atividade" htmlFor="edit-category">
          <Select
            id="edit-category"
            options={ACTIVITY_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
            {...register("category")}
          />
        </Field>

        <Field label="Notas" htmlFor="edit-notes" hint="Opcional">
          <Textarea
            id="edit-notes"
            placeholder="O que aconteceu hoje?"
            rows={3}
            {...register("notes")}
          />
        </Field>

        <div className="flex gap-3 mt-2">
          {onDeleteRequest && (
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="px-4 text-red-500 hover:text-red-600 hover:bg-red-50"
              onClick={() => {
                onClose();
                onDeleteRequest(record.id);
              }}
            >
              <Trash2 size={20} />
            </Button>
          )}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={saving}
            className="flex-1"
          >
            Salvar alterações
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
