"use client";

import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { toast } from "sonner";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import type { ShepherdingVisit } from "@/lib/types/pastoreio";
import { MemberCombobox, type MemberOption } from "./member-combobox";

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
  preselectedMemberId?: string | null;
  onSaved: (savedVisit: ShepherdingVisit) => void;
}

export function PastoreioFormSheet({
  open,
  onClose,
  userId,
  initialData,
  preselectedMemberId,
  onSaved,
}: PastoreioFormSheetProps) {
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedCompanionId, setSelectedCompanionId] = useState<string | null>(null);
  const [isCustomPerson, setIsCustomPerson] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
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

  // Load active congregation members
  useEffect(() => {
    if (!open) return;
    let isMounted = true;
    const fetchMembers = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("congregation_members")
          .select("id, full_name, appointment, service_status, is_self")
          .eq("active", true)
          .order("full_name", { ascending: true });

        if (!error && data && isMounted) {
          setMembers(data as MemberOption[]);
        }
      } catch {
        // Fallback transparent: form remains fully usable via text inputs
      }
    };
    fetchMembers();
    return () => {
      isMounted = false;
    };
  }, [open]);

  // Active members for visited person (excluding self)
  const candidateVisited = useMemo(() => {
    return members.filter((m: any) => !m.is_self);
  }, [members]);

  // Appointed brothers for companion (elders & MS only, excluding self)
  const appointedCompanions = useMemo(() => {
    return members.filter(
      (m: any) =>
        !m.is_self &&
        (m.appointment === "anciao" || m.appointment === "servo_ministerial")
    );
  }, [members]);

  // Synchronize form on open or data change
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

        const initialMemId = initialData.member_id || null;
        setSelectedMemberId(initialMemId);
        setIsCustomPerson(!initialMemId && !!initialData.family_or_person);
        setSelectedCompanionId(initialData.companion_member_id || null);
      } else {
        reset({
          family_or_person: "",
          visit_date: today,
          companion: "",
          next_visit_date: "",
          report: "",
        });

        if (preselectedMemberId) {
          setSelectedMemberId(preselectedMemberId);
          setIsCustomPerson(false);
          const found = members.find((m) => m.id === preselectedMemberId);
          if (found) {
            setValue("family_or_person", found.full_name);
          }
        } else {
          setSelectedMemberId(null);
          setIsCustomPerson(false);
        }
        setSelectedCompanionId(null);
      }
    }
  }, [open, initialData, preselectedMemberId, members, reset, setValue, today]);

  // Handle selecting a member from combobox
  const handleSelectMember = (m: MemberOption | null) => {
    if (m) {
      setSelectedMemberId(m.id);
      setIsCustomPerson(false);
      setValue("family_or_person", m.full_name, { shouldValidate: true });
    } else {
      setSelectedMemberId(null);
      setIsCustomPerson(false);
      setValue("family_or_person", "");
    }
  };

  // Handle custom person option
  const handleSelectCustom = () => {
    setSelectedMemberId(null);
    setIsCustomPerson(true);
    setValue("family_or_person", "", { shouldValidate: true });
  };

  // Handle selecting companion
  const handleSelectCompanion = (c: MemberOption | null) => {
    if (c) {
      setSelectedCompanionId(c.id);
      setValue("companion", c.full_name);
    } else {
      setSelectedCompanionId(null);
      setValue("companion", "");
    }
  };

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    const supabase = createClient();

    try {
      const payload = {
        family_or_person: data.family_or_person.trim(),
        visit_date: data.visit_date,
        companion: data.companion?.trim() || null,
        next_visit_date: data.next_visit_date || null,
        report: data.report?.trim() || null,
        member_id: selectedMemberId,
        companion_member_id: selectedCompanionId,
      };

      if (initialData?.id) {
        // Update
        const { data: updated, error } = await supabase
          .from("shepherding_visits")
          .update({
            ...payload,
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
            ...payload,
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
        {/* ── 1. PESSOA OU FAMÍLIA VISITADA ── */}
        {candidateVisited.length > 0 ? (
          <div className="flex flex-col gap-2">
            <MemberCombobox
              label="Pessoa ou família visitada"
              placeholder="Buscar irmão da congregação..."
              members={candidateVisited}
              selectedMemberId={selectedMemberId}
              onSelectMember={handleSelectMember}
              allowCustom
              customOptionLabel="Outra pessoa (digitar nome)"
              isCustomSelected={isCustomPerson}
              onSelectCustom={handleSelectCustom}
              required
              error={errors.family_or_person?.message}
            />

            {/* Nome gravado (editável para casos como 'Família Silva' ou texto livre) */}
            <Field
              label={
                selectedMemberId
                  ? "Nome no registro (editável)"
                  : "Nome da pessoa / família"
              }
              htmlFor="pastoreio-family"
              hint={
                selectedMemberId
                  ? "Você pode complementar ex.: 'Família de [Nome]'"
                  : undefined
              }
              required
            >
              <Input
                id="pastoreio-family"
                placeholder="Ex: Família Silva ou Irmão Paulo"
                error={!!errors.family_or_person}
                {...register("family_or_person")}
              />
            </Field>
          </div>
        ) : (
          /* Fallback se a consulta de irmãos falhar ou estiver indisponível */
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
        )}

        {/* ── 2. DATA DA VISITA ── */}
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

        {/* ── 3. QUEM ACOMPANHOU (ANCIÃOS OU SERVOS MINISTERIAIS) ── */}
        {appointedCompanions.length > 0 ? (
          <MemberCombobox
            label="Quem acompanhou"
            hint="Apenas anciãos ou servos ministeriais (opcional)"
            placeholder="Selecione o acompanhante (ou nenhum)..."
            emptyText="Nenhum ancião ou servo encontrado"
            members={appointedCompanions}
            selectedMemberId={selectedCompanionId}
            onSelectMember={handleSelectCompanion}
          />
        ) : (
          /* Fallback em caso de indisponibilidade da lista */
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
        )}

        {/* ── 4. PRÓXIMA VISITA (FOLLOW-UP) ── */}
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

        {/* ── 5. RELATÓRIO DA VISITA ── */}
        <Field
          label="Relatório da visita"
          htmlFor="pastoreio-report"
          hint="Texto corrido confidencial com anotações da visita"
        >
          <Textarea
            id="pastoreio-report"
            rows={7}
            className="min-h-[150px] leading-relaxed"
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
