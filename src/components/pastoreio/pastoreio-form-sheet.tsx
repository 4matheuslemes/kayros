"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { toast } from "sonner";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import type { ShepherdingVisit, ShepherdingVisitFormData } from "@/lib/types/pastoreio";

const schema = z.object({
  family_or_person: z.string().trim().min(1, "Informe o nome da família ou pessoa visitada"),
  visit_date: z.string().min(1, "Informe a data da visita"),
  companion: z.string().optional(),
  next_visit_date: z.string().optional(),
  report: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface PastoreioFormSheetProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  initialData?: ShepherdingVisit | null;
  onSaved: (savedVisit: ShepherdingVisit) => void;
}

export function PastoreioFormSheet({
  open,
  onClose,
  userId,
  initialData,
  onSaved,
}: PastoreioFormSheetProps) {
  const [saving, setSaving] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      family_or_person: "",
      visit_date: today,
      companion: "",
      next_visit_date: "",
      report: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (initialData) {
        reset({
          family_or_person: initialData.family_or_person,
          visit_date: initialData.visit_date,
          companion: initialData.companion ?? "",
          next_visit_date: initialData.next_visit_date ?? "",
          report: initialData.report ?? "",
        });
      } else {
        reset({
          family_or_person: "",
          visit_date: today,
          companion: "",
          next_visit_date: "",
          report: "",
        });
      }
    }
  }, [open, initialData, reset, today]);

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    const supabase = createClient();

    try {
      if (initialData?.id) {
        // Update
        const { data: updated, error } = await supabase
          .from("shepherding_visits")
          .update({
            family_or_person: data.family_or_person.trim(),
            visit_date: data.visit_date,
            companion: data.companion?.trim() || null,
            next_visit_date: data.next_visit_date || null,
            report: data.report?.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", initialData.id)
          .select()
          .single();

        if (error) throw error;
        toast.success("Visita atualizada");
        onSaved(updated as ShepherdingVisit);
        onClose();
      } else {
        // Insert
        const { data: created, error } = await supabase
          .from("shepherding_visits")
          .insert({
            user_id: userId,
            family_or_person: data.family_or_person.trim(),
            visit_date: data.visit_date,
            companion: data.companion?.trim() || null,
            next_visit_date: data.next_visit_date || null,
            report: data.report?.trim() || null,
          })
          .select()
          .single();

        if (error) throw error;
        toast.success("Visita de pastoreio registrada");
        onSaved(created as ShepherdingVisit);
        onClose();
      }
    } catch (err: unknown) {
      console.error("Error saving shepherding visit:", err);
      toast.error("Erro ao salvar visita. Verifique a conexão.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={initialData ? "Editar visita" : "Registrar visita de pastoreio"}
      description="Responsabilidade pastoral confidencial"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 mt-2" noValidate>
        <Field
          label="Família ou pessoa visitada"
          htmlFor="pastoreio-family"
          error={errors.family_or_person?.message}
          required
        >
          <Input
            id="pastoreio-family"
            placeholder="Ex: Família Silva ou Irmão Paulo"
            error={!!errors.family_or_person}
            {...register("family_or_person")}
          />
        </Field>

        <Field
          label="Data da visita"
          htmlFor="pastoreio-date"
          error={errors.visit_date?.message}
          required
        >
          <Input
            id="pastoreio-date"
            type="date"
            error={!!errors.visit_date}
            {...register("visit_date")}
          />
        </Field>

        <Field
          label="Quem acompanhou"
          htmlFor="pastoreio-companion"
          hint="Outro ancião ou servo ministerial (opcional)"
        >
          <Input
            id="pastoreio-companion"
            placeholder="Ex: Irmão Marcos"
            {...register("companion")}
          />
        </Field>

        <Field
          label="Próxima visita"
          htmlFor="pastoreio-next-date"
          hint="Data prevista para follow-up (opcional)"
        >
          <Input
            id="pastoreio-next-date"
            type="date"
            {...register("next_visit_date")}
          />
        </Field>

        <Field
          label="Relatório da visita"
          htmlFor="pastoreio-report"
          hint="Texto corrido livre para anotações completas da visita"
        >
          <Textarea
            id="pastoreio-report"
            rows={8}
            className="min-h-[160px] leading-relaxed"
            placeholder="Anotações e impressões sobre a visita, textos bíblicos considerados, necessidades observadas, incentivos transmitidos, pontos a acompanhar..."
            {...register("report")}
          />
        </Field>

        <div className="flex gap-3 pt-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="flex-1"
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            className="flex-1"
            loading={saving}
          >
            {initialData ? "Salvar alterações" : "Registrar visita"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
