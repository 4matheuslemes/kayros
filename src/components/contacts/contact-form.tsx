"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field, Select } from "@/components/ui/input";
import { CONTACT_STATUS } from "@/lib/constants";
import type { Contact } from "@/lib/db/dexie";
import { StudyProgressField } from "./study-progress-field";

const schema = z.object({
  name:      z.string().min(1, "Nome obrigatório"),
  address:   z.string().optional(),
  phone:     z.string().optional(),
  interests: z.string().optional(),
  status:    z.string().min(1),
  study_book_id: z.string().optional(),
  study_current_unit_id: z.string().optional(),
  study_frequency: z.number().optional(),
  study_days: z.array(z.number()).optional(),
  study_time: z.string().optional(),
  initial_visit_notes: z.string().optional(),
  initial_next_visit_date: z.string().optional(),
  initial_next_visit_time: z.string().optional(),
});

export type ContactFormData = z.infer<typeof schema>;

interface ContactFormProps {
  defaultValues?: Partial<Contact>;
  onSubmit: (data: ContactFormData) => Promise<void>;
  loading?: boolean;
  submitLabel?: string;
  isNew?: boolean;
}

export function ContactForm({
  defaultValues,
  onSubmit,
  loading,
  submitLabel = "Salvar interessado",
  isNew = false,
}: ContactFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:      defaultValues?.name ?? "",
      address:   defaultValues?.address ?? "",
      phone:     defaultValues?.phone ?? "",
      interests: defaultValues?.interests ?? "",
      status:    defaultValues?.status ?? "revisita",
      study_book_id: defaultValues?.study_book_id ?? "",
      study_current_unit_id: defaultValues?.study_current_unit_id ?? "",
      study_frequency: defaultValues?.study_frequency ?? 1,
      study_days: defaultValues?.study_days ?? [],
      study_time: defaultValues?.study_time ?? "",
      initial_visit_notes: "",
      initial_next_visit_date: "",
      initial_next_visit_time: "",
    },
  });

  const status = watch("status");
  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <Field label="Nome" htmlFor="contact-name" error={errors.name?.message} required>
        <Input
          id="contact-name"
          placeholder="Maria das Graças"
          error={!!errors.name}
          {...register("name")}
        />
      </Field>

      <Field label="Endereço" htmlFor="contact-address" hint="Rua, número, bairro">
        <Input
          id="contact-address"
          placeholder="Rua das Flores, 42"
          {...register("address")}
        />
      </Field>

      <Field label="Telefone" htmlFor="contact-phone">
        <Input
          id="contact-phone"
          type="tel"
          inputMode="tel"
          placeholder="(11) 9 8765-4321"
          {...register("phone")}
        />
      </Field>

      <Field label="Temas de interesse" htmlFor="contact-interests" hint="Versículos, publicações, tópicos discutidos">
        <Textarea
          id="contact-interests"
          placeholder="Ex: Esperança da ressurreição, Salmo 37…"
          rows={3}
          {...register("interests")}
        />
      </Field>

      {isNew && (
        <div className="flex flex-col gap-4 p-4 mt-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
          <h3 className="text-subheading text-[var(--ink)] mb-1">Primeira Conversa</h3>
          
          <Field label="O que conversamos" htmlFor="initial-visit-notes">
            <Textarea
              id="initial-visit-notes"
              placeholder="Anotações da conversa inicial..."
              rows={3}
              {...register("initial_visit_notes")}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Agendar retorno" htmlFor="initial-next-visit-date" hint="Opcional">
              <Input
                id="initial-next-visit-date"
                type="date"
                min={today}
                {...register("initial_next_visit_date")}
              />
            </Field>

            <Field label="Horário" htmlFor="initial-next-visit-time">
              <Input
                id="initial-next-visit-time"
                type="time"
                {...register("initial_next_visit_time")}
              />
            </Field>
          </div>
        </div>
      )}

      <Field label="Status" htmlFor="contact-status">
        <Select
          id="contact-status"
          options={CONTACT_STATUS.map((s) => ({ value: s.value, label: s.label }))}
          {...register("status")}
        />
      </Field>

      {status === "estudo_ativo" && (
        <StudyProgressField register={register} watch={watch} setValue={setValue} errors={errors} />
      )}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        loading={loading}
        className="w-full mt-2"
      >
        {submitLabel}
      </Button>
    </form>
  );
}
