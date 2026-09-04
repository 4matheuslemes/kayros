"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { StudyProgressField } from "./study-progress-field";
import { toast } from "sonner";
import { getDb, type Contact } from "@/lib/db/dexie";
import { enqueueSync } from "@/lib/db/sync";

const schema = z.object({
  study_book_id: z.string().optional(),
  study_current_unit_id: z.string().optional(),
  study_frequency: z.number().optional(),
  study_days: z.array(z.number()).optional(),
  study_time: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface ConvertStudySheetProps {
  open: boolean;
  onClose: () => void;
  contact: Contact;
  onSaved?: () => void;
}

export function ConvertStudySheet({ open, onClose, contact, onSaved }: ConvertStudySheetProps) {
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      study_frequency: 1,
      study_days: [],
    },
  });

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    const db = getDb();
    const now = new Date().toISOString();

    const updatedContact = {
      ...contact,
      status: "estudo_ativo" as const,
      study_book_id: data.study_book_id || undefined,
      study_current_unit_id: data.study_current_unit_id || undefined,
      study_frequency: data.study_frequency || undefined,
      study_days: data.study_days || undefined,
      study_time: data.study_time || undefined,
      updated_at: now,
      synced: false,
    };

    try {
      await db.contacts.put(updatedContact);
      await enqueueSync("contacts", contact.id, "UPDATE", updatedContact);
      toast.success(`${contact.name} agora é um estudo!`);
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error("Erro ao converter. Tente novamente.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title="Tornar estudo bíblico">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <p className="text-body-sm text-[var(--ink-muted)] mb-2">
          Você pode configurar o progresso do estudo agora ou deixar em branco e preencher mais tarde na ficha.
        </p>
        
        <StudyProgressField
          register={register as any}
          watch={watch as any}
          setValue={setValue as any}
          errors={errors}
        />

        <Button type="submit" variant="primary" size="lg" loading={saving} className="w-full mt-4">
          Confirmar e iniciar estudo
        </Button>
      </form>
    </Drawer>
  );
}
