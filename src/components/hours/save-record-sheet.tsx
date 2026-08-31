"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Textarea, Field } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ACTIVITY_CATEGORIES, type ActivityCategory, type ActivitySource } from "@/lib/constants";
import { getDb } from "@/lib/db/dexie";
import { enqueueSync } from "@/lib/db/sync";
import { cn } from "@/lib/utils";

const schema = z.object({
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface SaveRecordSheetProps {
  open: boolean;
  onClose: () => void;
  durationMinutes: number;
  userId: string;
  source: ActivitySource;
  defaultDate?: string; // ISO date
  onSaved?: () => void;
}

export function SaveRecordSheet({
  open,
  onClose,
  durationMinutes,
  userId,
  source,
  defaultDate,
  onSaved,
}: SaveRecordSheetProps) {
  const [category, setCategory] = useState<ActivityCategory>("convencional");
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    const db = getDb();
    const now = new Date().toISOString();
    const record = {
      id: uuidv4(),
      user_id: userId,
      date: defaultDate ?? format(new Date(), "yyyy-MM-dd"),
      duration_minutes: durationMinutes,
      category,
      source,
      notes: data.notes ?? "",
      created_at: now,
      updated_at: now,
      synced: false,
    };

    try {
      await db.daily_records.add(record);
      await enqueueSync("daily_records", record.id, "INSERT", record);
      toast.success(`${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m registrados`);
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error("Erro ao salvar o registro. Tente novamente.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Salvar registro"
      description={`${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m de pregação`}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        {/* Category chips */}
        <div>
          <p className="text-label text-[var(--ink)] mb-2.5">Tipo de atividade</p>
          <div className="flex flex-wrap gap-2">
            {ACTIVITY_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value)}
                className={cn(
                  "px-3.5 py-2 rounded-full text-sm font-sans font-medium border transition-all duration-150",
                  category === cat.value
                    ? "bg-[var(--primary)] border-[var(--primary)] text-white"
                    : "bg-[var(--surface)] border-[var(--border)] text-[var(--ink)] hover:border-[var(--primary)]"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <Field label="Notas do dia" htmlFor="save-notes" hint="Opcional — o que aconteceu hoje?">
          <Textarea
            id="save-notes"
            placeholder="Ex: falamos sobre o Salmo 83…"
            rows={3}
            {...register("notes")}
          />
        </Field>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={saving}
          className="w-full"
        >
          Salvar registro
        </Button>
      </form>
    </Drawer>
  );
}
