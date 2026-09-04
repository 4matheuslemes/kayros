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
import { getDb, type Contact } from "@/lib/db/dexie";
import { enqueueSync } from "@/lib/db/sync";
import { STUDY_BOOKS, getNextUnit } from "@/lib/study-books";
import { StudyProgressField } from "./study-progress-field";

const schema = z.object({
  visit_date:      z.string().min(1, "Escolha a data da visita"),
  notes:           z.string().optional(),
  next_visit_date: z.string().optional(),
  next_visit_time: z.string().optional(),
  advance_study:   z.boolean().optional(),
  became_study:    z.boolean().optional(),
  study_book_id:   z.string().optional(),
  study_current_unit_id: z.string().optional(),
  study_frequency: z.number().optional(),
  study_days:      z.array(z.number()).optional(),
  study_time:      z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface VisitFormSheetProps {
  open: boolean;
  onClose: () => void;
  contactId: string;
  contact?: Contact;
  onSaved?: () => void;
}

export function VisitFormSheet({ open, onClose, contactId, contact, onSaved }: VisitFormSheetProps) {
  const [saving, setSaving] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { visit_date: today, advance_study: false, became_study: false },
  });

  // Calculate next study unit
  let nextUnit = null;
  let hasActiveStudy = false;
  if (contact?.status === "estudo_ativo" && contact.study_book_id) {
    hasActiveStudy = true;
    nextUnit = getNextUnit(contact.study_book_id, contact.study_current_unit_id ?? null);
  }

  const isRevisita = contact?.status === "revisita";
  const becameStudy = watch("became_study");

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
      next_visit_time: data.next_visit_time || undefined,
      created_at: now,
      updated_at: now,
      synced: false,
    };

    try {
      await db.visit_history.add(record);
      await enqueueSync("visit_history", record.id, "INSERT", record);

      let contactUpdated = false;
      let updatedContact = { ...contact! };

      // Advance study if checked
      if (data.advance_study && contact && nextUnit) {
        updatedContact = {
          ...updatedContact,
          study_current_unit_id: nextUnit.id,
          updated_at: now,
          synced: false,
        };
        contactUpdated = true;
      }

      // Convert to study if checked
      if (data.became_study && isRevisita) {
        updatedContact = {
          ...updatedContact,
          status: "estudo_ativo",
          study_book_id: data.study_book_id || undefined,
          study_current_unit_id: data.study_current_unit_id || undefined,
          study_frequency: data.study_frequency || undefined,
          study_days: data.study_days || undefined,
          study_time: data.study_time || undefined,
          updated_at: now,
          synced: false,
        };
        contactUpdated = true;
      }

      if (contactUpdated) {
        await db.contacts.put(updatedContact);
        await enqueueSync("contacts", contactId, "UPDATE", updatedContact);
      }

      toast.success("Visita registrada");
      reset({ visit_date: today, advance_study: false, became_study: false });
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

        {hasActiveStudy && nextUnit && (
          <div className="flex items-start gap-3 p-3 bg-[var(--surface)] border border-[var(--border)] rounded-md">
            <input
              type="checkbox"
              id="advance-study"
              className="mt-1 w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
              {...register("advance_study")}
            />
            <label htmlFor="advance-study" className="text-body-sm text-[var(--ink)] leading-tight cursor-pointer select-none">
              <span className="font-medium block mb-0.5">Avançar estudo bíblico</span>
              Marcar a lição atual como concluída e avançar para: <strong>{nextUnit.label}</strong>
            </label>
          </div>
        )}

        <Field label="O que conversamos" htmlFor="visit-notes" hint="Opcional">
          <Textarea
            id="visit-notes"
            placeholder="Ex: Lemos Lucas 23:42, 43 — gostou muito do tema do paraíso…"
            rows={4}
            {...register("notes")}
          />
        </Field>

        {isRevisita && (
          <div className="flex flex-col gap-2">
            <div className="flex items-start gap-3 p-3 bg-[var(--surface)] border border-[var(--border)] rounded-md transition-colors hover:border-[var(--primary)]/50">
              <input
                type="checkbox"
                id="became-study"
                className="mt-1 w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)] cursor-pointer"
                {...register("became_study")}
              />
              <div className="flex flex-col">
                <label htmlFor="became-study" className="text-body-sm font-medium text-[var(--ink)] cursor-pointer select-none">
                  Isso virou um estudo bíblico?
                </label>
                <span className="text-caption text-[var(--ink-muted)]">
                  Marque para transformar esta revisita em um estudo ativo.
                </span>
              </div>
            </div>

            {becameStudy && (
              <div className="-mx-4 px-4 bg-black/5 dark:bg-white/5 py-4 my-2 border-y border-[var(--border)]">
                <p className="text-caption text-[var(--ink-muted)] mb-3">
                  Você pode preencher o progresso do estudo agora ou deixar em branco para configurar depois na ficha da pessoa.
                </p>
                <StudyProgressField
                  register={register as any}
                  watch={watch as any}
                  setValue={setValue as any}
                  errors={errors}
                />
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mt-2">
          <Field label="Próxima visita" htmlFor="next-visit-date" hint="Aparece na agenda">
            <Input
              id="next-visit-date"
              type="date"
              min={today}
              {...register("next_visit_date")}
            />
          </Field>

          <Field label="Horário" htmlFor="next-visit-time">
            <Input
              id="next-visit-time"
              type="time"
              {...register("next_visit_time")}
            />
          </Field>
        </div>
        
        {isRevisita && !becameStudy && (
          <p className="text-[11px] text-[var(--ink-muted)] leading-tight -mt-1 text-center">
            Se não marcar um novo retorno, esse pendente sai da sua Agenda.
          </p>
        )}

        <Button type="submit" variant="primary" size="lg" loading={saving} className="w-full mt-2">
          Salvar visita
        </Button>
      </form>
    </Drawer>
  );
}
