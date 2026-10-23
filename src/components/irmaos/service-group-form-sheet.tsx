"use client";

import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import type {
  ServiceGroup,
  CongregationMember,
} from "@/lib/types/congregation";
import { MemberCombobox, type MemberOption } from "@/components/pastoreio/member-combobox";
import { Trash2, AlertTriangle } from "lucide-react";

const schema = z.object({
  name: z.string().trim().min(2, "Informe o nome do grupo"),
  meeting_info: z.string().trim().min(1, "Informe as informações do campo"),
  sort_order: z.coerce.number().min(0, "Informe a ordem"),
});

type FormData = z.infer<typeof schema>;

interface ServiceGroupFormSheetProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  initialData?: ServiceGroup | null;
  members: CongregationMember[];
  defaultSortOrder?: number;
  onSaved: (savedGroup: ServiceGroup) => void;
  onDeleted?: (groupId: string) => void;
}

export function ServiceGroupFormSheet({
  open,
  onClose,
  userId,
  initialData,
  members,
  defaultSortOrder = 1,
  onSaved,
  onDeleted,
}: ServiceGroupFormSheetProps) {
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [selectedOverseerId, setSelectedOverseerId] = useState<string | null>(null);
  const [selectedAssistantId, setSelectedAssistantId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      meeting_info: "Consideração do campo às 8:15h",
      sort_order: defaultSortOrder,
    },
  });

  useEffect(() => {
    if (open) {
      if (initialData) {
        reset({
          name: initialData.name,
          meeting_info: initialData.meeting_info || "Consideração do campo às 8:15h",
          sort_order: initialData.sort_order,
        });
        setSelectedOverseerId(initialData.overseer_id);
        setSelectedAssistantId(initialData.assistant_id);
      } else {
        reset({
          name: "",
          meeting_info: "Consideração do campo às 8:15h",
          sort_order: defaultSortOrder,
        });
        setSelectedOverseerId(null);
        setSelectedAssistantId(null);
      }
    }
  }, [open, initialData, defaultSortOrder, reset]);

  // Candidate options for Overseer (active brothers, not self, excluding assistant)
  const candidateOverseers = useMemo<MemberOption[]>(() => {
    return members
      .filter((m) => m.active && !m.is_self && m.id !== selectedAssistantId)
      .map((m) => ({
        id: m.id,
        full_name: m.full_name,
        appointment: m.appointment,
        service_status: m.service_status,
      }));
  }, [members, selectedAssistantId]);

  // Candidate options for Assistant (active brothers, not self, excluding overseer)
  const candidateAssistants = useMemo<MemberOption[]>(() => {
    return members
      .filter((m) => m.active && !m.is_self && m.id !== selectedOverseerId)
      .map((m) => ({
        id: m.id,
        full_name: m.full_name,
        appointment: m.appointment,
        service_status: m.service_status,
      }));
  }, [members, selectedOverseerId]);

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    const supabase = createClient();

    try {
      const payload = {
        name: data.name.trim(),
        meeting_info: data.meeting_info.trim() || "Consideração do campo às 8:15h",
        sort_order: Number(data.sort_order) || 0,
        overseer_id: selectedOverseerId || null,
        assistant_id: selectedAssistantId || null,
      };

      let savedGroup: ServiceGroup;

      if (initialData?.id) {
        const { data: updated, error } = await supabase
          .from("service_groups")
          .update({
            ...payload,
            updated_at: new Date().toISOString(),
          })
          .eq("id", initialData.id)
          .select()
          .single();

        if (error) throw error;
        savedGroup = updated as ServiceGroup;
      } else {
        const { data: created, error } = await supabase
          .from("service_groups")
          .insert({
            user_id: userId,
            ...payload,
          })
          .select()
          .single();

        if (error) throw error;
        savedGroup = created as ServiceGroup;
      }

      // Regra: se o irmão escolhido como Superintendente ou Ajudante
      // ainda não estiver com group_id apontando para este grupo, atualizar automaticamente:
      const rolesToUpdate: string[] = [];
      if (selectedOverseerId) rolesToUpdate.push(selectedOverseerId);
      if (selectedAssistantId) rolesToUpdate.push(selectedAssistantId);

      if (rolesToUpdate.length > 0) {
        await supabase
          .from("congregation_members")
          .update({
            group_id: savedGroup.id,
            updated_at: new Date().toISOString(),
          })
          .in("id", rolesToUpdate);
      }

      toast.success(initialData ? "Grupo atualizado com sucesso" : "Grupo criado com sucesso");
      onSaved(savedGroup);
      onClose();
    } catch (err: unknown) {
      console.error("Error saving service group:", err);
      toast.error("Erro ao salvar grupo de serviço. Verifique se o nome já existe.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!initialData?.id) return;
    setDeleting(true);
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from("service_groups")
        .delete()
        .eq("id", initialData.id);

      if (error) throw error;
      toast.success("Grupo excluído com sucesso");
      onDeleted?.(initialData.id);
      setDeleteDialogOpen(false);
      onClose();
    } catch (err) {
      console.error("Error deleting group:", err);
      toast.error("Erro ao excluir grupo.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        title={initialData ? "Editar grupo de serviço" : "Novo grupo de serviço"}
        description="Organização do serviço de campo da congregação"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 mt-2" noValidate>
          {/* Nome do grupo */}
          <Field
            label="Nome do grupo"
            htmlFor="group-name"
            error={errors.name?.message}
            required
          >
            <Input
              id="group-name"
              placeholder="Ex: Grupo 1 - Centro"
              error={!!errors.name}
              {...register("name")}
            />
          </Field>

          {/* Horário / local de consideração */}
          <Field
            label="Horário e ponto de encontro"
            htmlFor="group-meeting-info"
            hint="Informações da saída de campo deste grupo"
            error={errors.meeting_info?.message}
            required
          >
            <Input
              id="group-meeting-info"
              placeholder="Ex: Consideração do campo às 8:15h"
              error={!!errors.meeting_info}
              {...register("meeting_info")}
            />
          </Field>

          {/* Ordem de exibição */}
          <Field
            label="Ordem de exibição"
            htmlFor="group-sort-order"
            hint="Número para ordenar os grupos (1, 2, 3...)"
            error={errors.sort_order?.message}
            required
          >
            <Input
              id="group-sort-order"
              type="number"
              min={0}
              error={!!errors.sort_order}
              {...register("sort_order")}
            />
          </Field>

          {/* Superintendente de grupo */}
          <MemberCombobox
            label="Superintendente de grupo"
            hint="Irmão responsável pela liderança do grupo"
            placeholder="Digite o nome do superintendente..."
            emptyText="Nenhum irmão encontrado"
            members={candidateOverseers}
            selectedMemberId={selectedOverseerId}
            onSelectMember={(m) => setSelectedOverseerId(m?.id || null)}
          />

          {/* Ajudante de grupo */}
          <MemberCombobox
            label="Ajudante de grupo"
            hint="Irmão que auxilia nos cuidados do grupo"
            placeholder="Digite o nome do ajudante..."
            emptyText="Nenhum irmão encontrado"
            members={candidateAssistants}
            selectedMemberId={selectedAssistantId}
            onSelectMember={(m) => setSelectedAssistantId(m?.id || null)}
          />

          {/* Botões de Ação */}
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
              {initialData ? "Salvar alterações" : "Criar grupo"}
            </Button>
          </div>

          {/* Botão de Excluir Grupo em Edição */}
          {initialData && (
            <div className="pt-3 border-t border-[var(--border)] mt-1 flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={saving}
                className="text-red-500 hover:text-red-600 hover:bg-red-500/10 text-body-sm w-full sm:w-auto"
              >
                <Trash2 size={14} className="mr-1.5" />
                Excluir grupo
              </Button>
            </div>
          )}
        </form>
      </Drawer>

      {/* Dialog de Confirmação de Exclusão do Grupo */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center mb-2 mx-auto">
              <AlertTriangle size={24} />
            </div>
            <DialogTitle className="text-center">Excluir grupo?</DialogTitle>
            <DialogDescription className="text-center text-body-sm leading-relaxed mt-2 text-[var(--ink-muted)]">
              O grupo será excluído, mas nenhum irmão será apagado do cadastro (todos os membros passarão a ficar &quot;Sem grupo&quot;).
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 mt-4">
            <Button
              variant="ghost"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDeleteGroup}
              loading={deleting}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              Confirmar exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
