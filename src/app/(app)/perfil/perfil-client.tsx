"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LogOut, User, FileText, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/layout/app-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { APP_NAME } from "@/lib/constants";
import { getDb, type Profile } from "@/lib/db/dexie";
import Link from "next/link";
import { SecuritySettings } from "@/components/security/security-settings";

const DAYS_OF_WEEK = [
  { id: 1, label: "SG" },
  { id: 2, label: "TE" },
  { id: 3, label: "QA" },
  { id: 4, label: "QI" },
  { id: 5, label: "SX" },
  { id: 6, label: "SB" },
  { id: 7, label: "DO" },
];

const schema = z.object({
  full_name:              z.string().min(1, "Nome obrigatório"),
  congregation_name:      z.string().optional(),
  monthly_goal_hours:     z.coerce.number().int().min(1).max(300),
  working_days:           z.array(z.number()).min(1, "Selecione ao menos um dia"),
});

type FormData = z.infer<typeof schema>;

interface PerfilClientProps {
  userId: string;
  email: string;
  profile: Profile;
}

export function PerfilClient({ userId, email, profile }: PerfilClientProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name:          profile.full_name,
      congregation_name:  profile.congregation_name ?? "",
      monthly_goal_hours: profile.monthly_goal_hours,
      working_days:       profile.working_days ?? [1, 2, 3, 4, 5, 6, 7],
    },
  });

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("profiles").upsert({
      id:                  userId,
      full_name:           data.full_name,
      congregation_name:   data.congregation_name ?? null,
      monthly_goal_hours:  data.monthly_goal_hours,
      service_year_start_month: profile.service_year_start_month,
      working_days:        data.working_days,
    });
    if (error) {
      toast.error("Erro ao salvar. Tente novamente.");
    } else {
      toast.success("Perfil atualizado");
      const db = getDb();
      await db.profiles.update(userId, {
        full_name: data.full_name,
        congregation_name: data.congregation_name ?? undefined,
        monthly_goal_hours: data.monthly_goal_hours,
        working_days: data.working_days,
      });
      // Reset form to clear isDirty state with new values
      reset(data);
      setIsEditing(false);
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-5">
      <AppHeader title="Perfil" subtitle={email} />

      {/* Profile form */}
      <Card>
        <div className="flex items-center gap-2 mb-5">
          <User size={16} className="text-[var(--primary)]" />
          <h2 className="text-subheading text-[var(--ink)]">Perfil</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
          <Field label="Nome completo" htmlFor="profile-name" error={errors.full_name?.message} required>
            <Input
              id="profile-name"
              placeholder="João da Silva"
              error={!!errors.full_name}
              disabled={!isEditing}
              {...register("full_name")}
            />
          </Field>

          <Field label="Congregação" htmlFor="profile-congregation" hint="Opcional">
            <Input
              id="profile-congregation"
              placeholder="Congregação Central"
              disabled={!isEditing}
              {...register("congregation_name")}
            />
          </Field>

          <Field
            label="Meta mensal de horas"
            htmlFor="profile-goal"
            error={errors.monthly_goal_hours?.message}
            hint="Padrão: 50 horas"
          >
            <Input
              id="profile-goal"
              type="number"
              inputMode="numeric"
              min={1}
              max={300}
              error={!!errors.monthly_goal_hours}
              disabled={!isEditing}
              {...register("monthly_goal_hours")}
            />
          </Field>

          {/* Schedule */}
          <div className="pt-4 mt-2 border-t border-[var(--border)] flex flex-col gap-1.5">
            <label className="text-label text-[var(--ink)]">
              Programação
            </label>
            
            <div className="flex flex-wrap justify-center gap-1.5">
              {DAYS_OF_WEEK.map((day) => {
                const currentDays = watch("working_days") || [];
                const isSelected = currentDays.includes(day.id);
                return (
                  <button
                    key={day.id}
                    type="button"
                    disabled={!isEditing}
                    onClick={() => {
                      if (isSelected) {
                        if (currentDays.length > 1) {
                          setValue("working_days", currentDays.filter(d => d !== day.id), { shouldValidate: true, shouldDirty: true });
                        } else {
                          toast.error("Selecione ao menos um dia.");
                        }
                      } else {
                        setValue("working_days", [...currentDays, day.id].sort(), { shouldValidate: true, shouldDirty: true });
                      }
                    }}
                    className={`w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0 flex items-center justify-center rounded-full text-[11px] font-sans font-semibold transition-all ${
                      isSelected
                        ? "bg-[var(--primary)] text-white shadow-sm"
                        : "bg-[var(--surface)] border border-[var(--border)] text-[var(--ink-muted)] hover:bg-[var(--background)]"
                    } ${!isEditing && isSelected ? "opacity-80" : ""} disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
            
            <p className="text-caption text-[var(--ink-muted)] mt-3">
              Os dias selecionados são usados para prever a viabilidade da sua meta mensal.
            </p>
          </div>

          {!isEditing ? (
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="w-full mt-2"
              onClick={(e) => {
                e.preventDefault();
                setIsEditing(true);
              }}
            >
              Editar
            </Button>
          ) : (
            <div className="flex gap-3 mt-2">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                className="flex-1"
                onClick={() => {
                  reset();
                  setIsEditing(false);
                }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={saving}
                disabled={!isDirty}
                className="flex-1"
              >
                Salvar
              </Button>
            </div>
          )}
        </form>
      </Card>

      {/* Security */}
      <SecuritySettings />

      {/* Quick links */}
      <Card padding="none" className="overflow-hidden divide-y divide-[var(--border)]">
        <Link
          href="/relatorio"
          className="flex items-center gap-3 px-5 py-4 hover:bg-[var(--background)] transition-colors text-body-sm text-[var(--ink)]"
        >
          <FileText size={16} className="text-[var(--ink-muted)]" />
          Relatório do mês
        </Link>
      </Card>

      {/* App info */}
      <p className="text-center text-caption text-[var(--ink-muted)]">
        {APP_NAME} — uso pessoal
      </p>

      {/* Logout */}
      <Button
        variant="ghost"
        size="lg"
        onClick={handleLogout}
        loading={loggingOut}
        className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
        id="btn-logout"
      >
        <LogOut size={18} />
        Sair da conta
      </Button>
    </div>
  );
}
