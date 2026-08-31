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
import { Input, Textarea, Field } from "@/components/ui/input";
import { getDb } from "@/lib/db/dexie";
import { enqueueSync } from "@/lib/db/sync";

const schema = z.object({
  visit_date:      z.string().min(1, "Escolha a data da visita"),
  notes:           z.string().optional(),
  next_visit_date: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface VisitFormSheetProps {
  open: boolean;
  onClose: () => void;
  contactId: string;
  onSaved?: () => void;
}

export function VisitFormSheet({ open, onClose, contactId, onSaved }: VisitFormSheetProps) {
  const [saving, setSaving] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { visit_date: today },
  });

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    const db = getDb();
    const now = new Date().toISOString();
    const record = {
      id: uuidv4(),
      contact_id: contactId,
      visit_date: data.visit_date,
      notes: data.notes ?? "",
      next_visit_date: data.next_visit_date || undefined,
      created_at: now,
      updated_at: now,
      synced: false,
    };

    try {
      await db.visit_history.add(record);
      await enqueueSync("visit_history", record.id, "INSERT", record);
      toast.success("Visita registrada");
      reset({ visit_date: today });
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error("Erro ao salvar. Tente novamente.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title="Registrar visita">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <Field label="Data da visita" htmlFor="visit-date" error={errors.visit_date?.message} required>
          <Input
            id="visit-date"
            type="date"
            max={today}
            error={!!errors.visit_date}
            {...register("visit_date")}
          />
        </Field>

        <Field label="O que conversamos" htmlFor="visit-notes" hint="Opcional">
          <Textarea
            id="visit-notes"
            placeholder="Ex: Lemos Lucas 23:42, 43 — gostou muito do tema do paraíso…"
            rows={4}
            {...register("notes")}
          />
        </Field>

        <Field label="Próxima visita" htmlFor="next-visit-date" hint="Aparece na agenda do painel">
          <Input
            id="next-visit-date"
            type="date"
            min={today}
            {...register("next_visit_date")}
          />
        </Field>

        <Button type="submit" variant="primary" size="lg" loading={saving} className="w-full">
          Salvar visita
        </Button>
      </form>
    </Drawer>
  );
}
