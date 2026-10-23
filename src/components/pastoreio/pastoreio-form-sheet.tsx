"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO, addMonths } from "date-fns";
import { toast } from "sonner";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import type { ShepherdingVisit } from "@/lib/types/pastoreio";
import { MemberCombobox, type MemberOption } from "./member-combobox";
import { MemberMultiCombobox } from "./member-multi-combobox";
import { SHEPHERDING_REVISIT_MONTHS } from "@/lib/constants";
import { useUserPermissions } from "@/contexts/user-permissions-context";
import { isCurrentUserMember } from "@/lib/permissions";

const schema = z.object({
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
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [selectedCompanionId, setSelectedCompanionId] = useState<string | null>(null);
  const [visitedError, setVisitedError] = useState<string | null>(null);
  const [savedVisitId, setSavedVisitId] = useState<string | null>(null);
  const [isNextVisitManuallyEdited, setIsNextVisitManuallyEdited] = useState(false);

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
      visit_date: today,
      companion: "",
      next_visit_date: "",
      report: "",
    },
  });

  const watchVisitDate = watch("visit_date");

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
        // Fallback transparent
      }
    };
    fetchMembers();
    return () => {
      isMounted = false;
    };
  }, [open]);

  // Recalculate suggested next visit date if visit_date changes and not manually edited
  useEffect(() => {
    if (!open || initialData || isNextVisitManuallyEdited) return;
    if (!watchVisitDate) return;

    try {
      const parsed = parseISO(watchVisitDate);
      const suggested = format(addMonths(parsed, SHEPHERDING_REVISIT_MONTHS), "yyyy-MM-dd");
      setValue("next_visit_date", suggested);
    } catch {
      // Ignora erro de data inválida durante digitação
    }
  }, [watchVisitDate, open, initialData, isNextVisitManuallyEdited, setValue]);

  // Synchronize form state on open / data change
  useEffect(() => {
    if (!open) return;

    setSavedVisitId(null);
    setVisitedError(null);

    if (initialData) {
      reset({
        visit_date: initialData.visit_date,
        companion: initialData.companion ?? "",
        next_visit_date: initialData.next_visit_date ?? "",
        report: initialData.report ?? "",
      });

      setSelectedCompanionId(initialData.companion_member_id || null);
      setIsNextVisitManuallyEdited(true);

      // Initialize selectedMemberIds if already present in object
      if (initialData.member_ids && initialData.member_ids.length > 0) {
        setSelectedMemberIds(initialData.member_ids);
      }

      // Load linked members for this visit from database
      let isMounted = true;
      const loadLinkedMembers = async () => {
        try {
          const supabase = createClient();
          const { data, error } = await supabase
            .from("shepherding_visit_members")
            .select("member_id")
            .eq("visit_id", initialData.id);

          if (!error && data && isMounted) {
            const ids = data.map((d: { member_id: string }) => d.member_id);
            setSelectedMemberIds(ids);
          }
        } catch {
          // Mantém se já tiver
        }
      };

      loadLinkedMembers();

      return () => {
        isMounted = false;
      };
    } else {
      // Nova visita
      const initialSuggestedNext = format(
        addMonths(new Date(), SHEPHERDING_REVISIT_MONTHS),
        "yyyy-MM-dd"
      );

      reset({
        visit_date: today,
        companion: "",
        next_visit_date: initialSuggestedNext,
        report: "",
      });

      setIsNextVisitManuallyEdited(false);
      setSelectedCompanionId(null);

      if (preselectedMemberId) {
        setSelectedMemberIds([preselectedMemberId]);
      } else {
        setSelectedMemberIds([]);
      }
    }
  }, [open, initialData, preselectedMemberId, reset, today]);

  const { memberId } = useUserPermissions();

  // Candidates for visited members: active, not self, and NOT selected as companion
  const candidateVisited = useMemo(() => {
    return members.filter(
      (m: any) =>
        !isCurrentUserMember(m, { memberId, userId }) &&
        m.id !== selectedCompanionId
    );
  }, [members, selectedCompanionId, memberId, userId]);

  // Candidates for companion: elders & MS, not self, and NOT in selected visited members
  const appointedCompanions = useMemo(() => {
    return members.filter(
      (m: any) =>
        !isCurrentUserMember(m, { memberId, userId }) &&
        (m.appointment === "anciao" || m.appointment === "servo_ministerial") &&
        !selectedMemberIds.includes(m.id)
    );
  }, [members, selectedMemberIds, memberId, userId]);

  // Multi-select handlers for Visited Members
  const handleToggleMember = useCallback((memberId: string) => {
    setSelectedMemberIds((prev) => {
      const exists = prev.includes(memberId);
      const next = exists ? prev.filter((id) => id !== memberId) : [...prev, memberId];
      if (next.length > 0) setVisitedError(null);
      return next;
    });
  }, []);

  const handleRemoveMember = useCallback((memberId: string) => {
    setSelectedMemberIds((prev) => prev.filter((id) => id !== memberId));
  }, []);

  // Companion selection handler
  const handleSelectCompanion = useCallback(
    (c: MemberOption | null) => {
      if (c) {
        setSelectedCompanionId(c.id);
        setValue("companion", c.full_name);
      } else {
        setSelectedCompanionId(null);
        setValue("companion", "");
      }
    },
    [setValue]
  );

  const onSubmit = async (data: FormData) => {
    const memberNames = selectedMemberIds
      .map((id) => members.find((m) => m.id === id)?.full_name)
      .filter(Boolean) as string[];

    if (memberNames.length === 0) {
      setVisitedError("Escolha pelo menos uma pessoa");
      return;
    }
    setVisitedError(null);
    setSaving(true);

    const summary = memberNames.join(", ");
    const supabase = createClient();

    const visitIdToUpdate = savedVisitId || initialData?.id;

    const payload = {
      family_or_person: summary,
      visit_date: data.visit_date,
      companion: data.companion?.trim() || null,
      next_visit_date: data.next_visit_date || null,
      report: data.report?.trim() || null,
      companion_member_id: selectedCompanionId || null,
      member_id: null, // Legado: não gravamos mais
    };

    try {
      let savedVisit: ShepherdingVisit;

      if (visitIdToUpdate) {
        const { data: updated, error } = await supabase
          .from("shepherding_visits")
          .update({
            ...payload,
            updated_at: new Date().toISOString(),
          })
          .eq("id", visitIdToUpdate)
          .select()
          .single();

        if (error) throw error;
        savedVisit = updated as ShepherdingVisit;
      } else {
        const { data: created, error } = await supabase
          .from("shepherding_visits")
          .insert({
            user_id: userId,
            ...payload,
          })
          .select()
          .single();

        if (error) throw error;
        savedVisit = created as ShepherdingVisit;
        setSavedVisitId(savedVisit.id);
      }

      // Sync members via RPC set_visit_members
      const { error: rpcError } = await supabase.rpc("set_visit_members", {
        p_visit_id: savedVisit.id,
        p_member_ids: selectedMemberIds,
      });

      if (rpcError) {
        console.error("RPC set_visit_members error:", rpcError);
        toast.error("Visita gravada, mas houve erro ao salvar os irmãos visitados. Tente salvar novamente.");
        // Não fecha o formulário; o ID já está em savedVisitId para nova tentativa sem duplicar
        return;
      }

      toast.success(initialData ? "Visita atualizada" : "Visita de pastoreio registrada");
      onSaved({
        ...savedVisit,
        member_ids: selectedMemberIds,
      });
      onClose();
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
        {/* ── 1. QUEM FOI VISITADO (MÚLTIPLA SELEÇÃO FLUIDA COM TAG/CHIPS) ── */}
        <MemberMultiCombobox
          label="Quem foi visitado"
          required
          error={visitedError ?? undefined}
          members={candidateVisited}
          selectedMemberIds={selectedMemberIds}
          onToggleMember={handleToggleMember}
          onRemoveMember={handleRemoveMember}
        />

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

        {/* ── 3. QUEM ACOMPANHOU (ANCIÃOS OU SERVOS MINISTERIAIS - SELEÇÃO ÚNICA COM INPUT DIRETO) ── */}
        {appointedCompanions.length > 0 ? (
          <MemberCombobox
            label="Quem acompanhou"
            hint="Apenas anciãos ou servos ministeriais (opcional)"
            placeholder="Digite o nome do acompanhante..."
            emptyText="Nenhum ancião ou servo encontrado"
            members={appointedCompanions}
            selectedMemberId={selectedCompanionId}
            onSelectMember={handleSelectCompanion}
          />
        ) : (
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

        {/* ── 4. PRÓXIMA VISITA (SUGERIDA AUTOMATICAMENTE EM 8 MESES) ── */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label htmlFor="pastoreio-next-date" className="text-label text-[var(--ink)]">
              Próxima visita (sugerida)
            </label>
            <button
              type="button"
              onClick={() => {
                setValue("next_visit_date", "");
                setIsNextVisitManuallyEdited(true);
              }}
              className="text-xs text-[var(--ink-muted)] hover:text-red-500 transition-colors cursor-pointer"
            >
              Sem próxima visita / Limpar
            </button>
          </div>
          <Input
            id="pastoreio-next-date"
            type="date"
            {...register("next_visit_date", {
              onChange: () => setIsNextVisitManuallyEdited(true),
            })}
          />
          <p className="text-caption text-[var(--ink-muted)] italic">
            Daqui a 8 meses. É só um lembrete para eu olhar de novo.
          </p>
        </div>

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
