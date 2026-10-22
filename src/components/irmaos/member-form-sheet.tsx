"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input, Field, Select } from "@/components/ui/input";
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
  CongregationMember,
  CongregationAppointment,
  CongregationServiceStatus,
} from "@/lib/types/congregation";
import { Archive, ArchiveRestore, Trash2, AlertTriangle } from "lucide-react";

const schema = z.object({
  full_name: z.string().trim().min(2, "Informe o nome completo"),
  appointment: z.enum(["none", "anciao", "servo_ministerial"]),
  service_status: z.enum([
    "publicador_batizado",
    "publicador_nao_batizado",
    "pioneiro_regular",
    "pioneiro_auxiliar_continuo",
  ]),
  active: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface MemberFormSheetProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  initialData?: CongregationMember | null;
  onSaved: (savedMember: CongregationMember) => void;
  onDeleted?: (memberId: string) => void;
}

export function MemberFormSheet({
  open,
  onClose,
  userId,
  initialData,
  onSaved,
  onDeleted,
}: MemberFormSheetProps) {
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
      full_name: "",
      appointment: "none",
      service_status: "publicador_batizado",
      active: true,
    },
  });

  const activeValue = watch("active");

  useEffect(() => {
    if (open) {
      if (initialData) {
        reset({
          full_name: initialData.full_name,
          appointment: initialData.appointment ?? "none",
          service_status: initialData.service_status,
          active: initialData.active,
        });
      } else {
        reset({
          full_name: "",
          appointment: "none",
          service_status: "publicador_batizado",
          active: true,
        });
      }
    }
  }, [open, initialData, reset]);

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    const supabase = createClient();

    try {
      const appValue: CongregationAppointment | null =
        data.appointment === "none" ? null : (data.appointment as CongregationAppointment);

      if (initialData?.id) {
        // Update
        const { data: updated, error } = await supabase
          .from("congregation_members")
          .update({
            full_name: data.full_name.trim(),
            appointment: appValue,
            service_status: data.service_status as CongregationServiceStatus,
            active: data.active,
            updated_at: new Date().toISOString(),
          })
          .eq("id", initialData.id)
          .select()
          .single();

        if (error) throw error;
        toast.success("Cadastro atualizado com sucesso");
        onSaved(updated as CongregationMember);
        onClose();
      } else {
        // Insert
        const { data: created, error } = await supabase
          .from("congregation_members")
          .insert({
            user_id: userId,
            full_name: data.full_name.trim(),
            appointment: appValue,
            service_status: data.service_status as CongregationServiceStatus,
            active: data.active,
          })
          .select()
          .single();

        if (error) throw error;
        toast.success("Irmão cadastrado com sucesso");
        onSaved(created as CongregationMember);
        onClose();
      }
    } catch (err: unknown) {
      console.error("Error saving congregation member:", err);
      toast.error("Erro ao salvar cadastro. Verifique se o nome já existe.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleArchive = async () => {
    if (!initialData?.id) return;
    setSaving(true);
    const supabase = createClient();
    try {
      const newStatus = !initialData.active;
      const { data: updated, error } = await supabase
        .from("congregation_members")
        .update({
          active: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", initialData.id)
        .select()
        .single();

      if (error) throw error;
      toast.success(newStatus ? "Cadastro reativado" : "Cadastro arquivado");
      onSaved(updated as CongregationMember);
      onClose();
    } catch (err) {
      console.error("Error toggling archive status:", err);
      toast.error("Erro ao alterar status do cadastro");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!initialData?.id) return;
    setDeleting(true);
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from("congregation_members")
        .delete()
        .eq("id", initialData.id);

      if (error) throw error;
      toast.success("Cadastro excluído com sucesso");
      onDeleted?.(initialData.id);
      setDeleteDialogOpen(false);
      onClose();
    } catch (err) {
      console.error("Error deleting member:", err);
      toast.error("Erro ao excluir cadastro");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        title={initialData ? "Editar irmão" : "Novo irmão"}
        description="Cadastro confidencial da congregação"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 mt-2" noValidate>
          {/* Nome completo */}
          <Field
            label="Nome completo"
            htmlFor="member-full-name"
            error={errors.full_name?.message}
            required
          >
            <Input
              id="member-full-name"
              placeholder="Ex: Carlos Oliveira"
              error={!!errors.full_name}
              {...register("full_name")}
            />
          </Field>

          {/* Designação */}
          <Field
            label="Designação"
            htmlFor="member-appointment"
            hint="Responsabilidade congregacional"
          >
            <Select
              id="member-appointment"
              options={[
                { value: "none", label: "Nenhuma" },
                { value: "anciao", label: "Ancião" },
                { value: "servo_ministerial", label: "Servo ministerial" },
              ]}
              {...register("appointment")}
            />
          </Field>

          {/* Situação no serviço */}
          <Field
            label="Situação no ministério"
            htmlFor="member-service-status"
            required
          >
            <Select
              id="member-service-status"
              options={[
                { value: "publicador_batizado", label: "Publicador batizado" },
                { value: "publicador_nao_batizado", label: "Publicador não batizado" },
                { value: "pioneiro_regular", label: "Pioneiro regular" },
                { value: "pioneiro_auxiliar_continuo", label: "Pioneiro auxiliar contínuo" },
              ]}
              {...register("service_status")}
            />
          </Field>

          {/* Ativo / Inativo */}
          <div className="flex items-center justify-between p-3.5 bg-[var(--background)]/70 border border-[var(--border)] rounded-lg">
            <div className="flex flex-col">
              <span className="text-body-sm font-medium text-[var(--ink)]">
                Cadastro ativo
              </span>
              <span className="text-caption text-[var(--ink-muted)]">
                Irmãos inativos ficam arquivados e não aparecem nas listas de novas visitas.
              </span>
            </div>
            <input
              type="checkbox"
              id="member-active"
              checked={activeValue}
              onChange={(e) => setValue("active", e.target.checked)}
              className="w-5 h-5 accent-[var(--primary)] rounded cursor-pointer"
            />
          </div>

          {/* Ações primárias */}
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
              {initialData ? "Salvar alterações" : "Cadastrar irmão"}
            </Button>
          </div>

          {/* Ações secundárias em modo de edição (Arquivar e Excluir) */}
          {initialData && !initialData.is_self && (
            <div className="flex items-center justify-between pt-3 border-t border-[var(--border)] gap-2 mt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleToggleArchive}
                disabled={saving}
                className="text-body-sm"
              >
                {initialData.active ? (
                  <>
                    <Archive size={14} className="mr-1.5 text-[var(--ink-muted)]" />
                    Arquivar
                  </>
                ) : (
                  <>
                    <ArchiveRestore size={14} className="mr-1.5 text-[var(--primary)]" />
                    Reativar
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={saving}
                className="text-red-500 hover:text-red-600 hover:bg-red-500/10 text-body-sm"
              >
                <Trash2 size={14} className="mr-1.5" />
                Excluir
              </Button>
            </div>
          )}
        </form>
      </Drawer>

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center mb-2 mx-auto">
              <AlertTriangle size={24} />
            </div>
            <DialogTitle className="text-center">Excluir irmão?</DialogTitle>
            <DialogDescription className="text-center text-body-sm leading-relaxed mt-2">
              As visitas de pastoreio já realizadas continuarão salvas no histórico,
              apenas perderão o vínculo com este cadastro.
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
              onClick={handleDeleteConfirm}
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
