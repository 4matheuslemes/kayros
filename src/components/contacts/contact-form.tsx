"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field, Select } from "@/components/ui/input";
import { CONTACT_STATUS } from "@/lib/constants";
import type { Contact } from "@/lib/db/dexie";

const schema = z.object({
  name:      z.string().min(1, "Nome obrigatório"),
  address:   z.string().optional(),
  phone:     z.string().optional(),
  interests: z.string().optional(),
  status:    z.string().min(1),
});

export type ContactFormData = z.infer<typeof schema>;

interface ContactFormProps {
  defaultValues?: Partial<Contact>;
  onSubmit: (data: ContactFormData) => Promise<void>;
  loading?: boolean;
  submitLabel?: string;
}

export function ContactForm({
  defaultValues,
  onSubmit,
  loading,
  submitLabel = "Salvar interessado",
}: ContactFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:      defaultValues?.name ?? "",
      address:   defaultValues?.address ?? "",
      phone:     defaultValues?.phone ?? "",
      interests: defaultValues?.interests ?? "",
      status:    defaultValues?.status ?? "revisita",
    },
  });

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

      <Field label="Status" htmlFor="contact-status">
        <Select
          id="contact-status"
          options={CONTACT_STATUS.map((s) => ({ value: s.value, label: s.label }))}
          {...register("status")}
        />
      </Field>

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
