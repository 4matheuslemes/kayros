"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { getDb } from "@/lib/db/dexie";
import { Card } from "@/components/ui/card";
import { User, Target, CalendarDays, CheckCircle2 } from "lucide-react";

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
  full_name: z.string().min(1, "Nome obrigatório"),
  monthly_goal_hours: z.coerce.number().int().min(1).max(300),
  working_days: z.array(z.number()),
});

type FormData = z.infer<typeof schema>;

interface OnboardingClientProps {
  userId: string;
  initialName: string;
  canUseHours?: boolean;
}

export function OnboardingClient({
  userId,
  initialName,
  canUseHours = true,
}: OnboardingClientProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: initialName,
      monthly_goal_hours: 50,
      working_days: canUseHours ? [] : [1, 2, 3, 4, 5, 6, 7],
    },
  });

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    const supabase = createClient();

    // Upsert into supabase
    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      full_name: data.full_name,
      monthly_goal_hours: canUseHours ? data.monthly_goal_hours : 50,
      working_days: canUseHours ? data.working_days : [1, 2, 3, 4, 5, 6, 7],
      onboarding_completed: true,
    });

    if (error) {
      toast.error("Erro ao salvar. Tente novamente.");
      setSaving(false);
      return;
    }

    // Update local Dexie DB
    const db = getDb();
    const existing = await db.profiles.get(userId);
    if (existing) {
      await db.profiles.update(userId, {
        full_name: data.full_name,
        monthly_goal_hours: canUseHours ? data.monthly_goal_hours : 50,
        working_days: canUseHours ? data.working_days : [1, 2, 3, 4, 5, 6, 7],
        onboarding_completed: true,
      });
    } else {
      await db.profiles.add({
        id: userId,
        full_name: data.full_name,
        monthly_goal_hours: canUseHours ? data.monthly_goal_hours : 50,
        service_year_start_month: 9,
        working_days: canUseHours ? data.working_days : [1, 2, 3, 4, 5, 6, 7],
        onboarding_completed: true,
      });
    }

    toast.success("Bem-vindo ao Kairós!");
    router.replace("/");
  };

  const nextStep = () => {
    if (step === 1 && !watch("full_name")) {
      toast.error("Preencha seu nome");
      return;
    }
    setStep((s) => s + 1);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col justify-center max-w-md mx-auto p-4 gap-6">
      <div className="text-center space-y-2">
        <h1 className="font-display font-semibold text-3xl text-[var(--ink)]">
          Bem-vindo ao Kairós
        </h1>
        <p className="text-body text-[var(--ink-muted)]">
          {canUseHours
            ? "Vamos configurar seu perfil rapidamente."
            : "Confirme seus dados para acessar o app da congregação."}
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2 text-[var(--primary)] mb-2">
                <User size={20} />
                <h2 className="text-subheading font-medium">
                  Como podemos te chamar?
                </h2>
              </div>
              <Field
                label="Nome completo ou de preferência"
                htmlFor="full_name"
                error={errors.full_name?.message}
              >
                <Input
                  id="full_name"
                  placeholder="Seu nome"
                  {...register("full_name")}
                  autoFocus
                />
              </Field>

              {canUseHours ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  size="lg"
                  className="w-full"
                >
                  Continuar
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="lg"
                  loading={saving}
                  className="w-full"
                >
                  Concluir cadastro
                </Button>
              )}
            </div>
          )}

          {canUseHours && step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2 text-[var(--primary)] mb-2">
                <Target size={20} />
                <h2 className="text-subheading font-medium">Sua meta mensal</h2>
              </div>
              <p className="text-sm text-[var(--ink-muted)]">
                Quantas horas você planeja dedicar por mês?
              </p>
              <Field
                label="Horas"
                htmlFor="monthly_goal_hours"
                error={errors.monthly_goal_hours?.message}
              >
                <Input
                  id="monthly_goal_hours"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={300}
                  {...register("monthly_goal_hours")}
                />
              </Field>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  onClick={() => setStep(1)}
                  className="w-1/3"
                >
                  Voltar
                </Button>
                <Button
                  type="button"
                  onClick={nextStep}
                  size="lg"
                  className="w-2/3"
                >
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {canUseHours && step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2 text-[var(--primary)] mb-2">
                <CalendarDays size={20} />
                <h2 className="text-subheading font-medium">
                  Dias de campo habituais
                </h2>
              </div>
              <p className="text-sm text-[var(--ink-muted)]">
                Selecione os dias da semana em que você costuma sair no campo.
              </p>

              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {DAYS_OF_WEEK.map((day) => {
                  const currentDays = watch("working_days") || [];
                  const isSelected = currentDays.includes(day.id);
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setValue(
                            "working_days",
                            currentDays.filter((d) => d !== day.id),
                            { shouldValidate: true }
                          );
                        } else {
                          setValue(
                            "working_days",
                            [...currentDays, day.id].sort(),
                            { shouldValidate: true }
                          );
                        }
                      }}
                      className={`w-11 h-11 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                        isSelected
                          ? "bg-[var(--primary)] text-white shadow-sm"
                          : "bg-[var(--surface)] border border-[var(--border)] text-[var(--ink-muted)] hover:bg-[var(--background)]"
                      }`}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  onClick={() => setStep(2)}
                  className="w-1/3"
                >
                  Voltar
                </Button>
                <Button
                  type="submit"
                  size="lg"
                  loading={saving}
                  className="w-2/3"
                >
                  <CheckCircle2 size={18} className="mr-2" />
                  Concluir
                </Button>
              </div>
            </div>
          )}
        </form>
      </Card>
    </div>
  );
}
