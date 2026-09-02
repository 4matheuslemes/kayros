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
  working_days: z.array(z.number()).min(1, "Selecione ao menos um dia"),
});

type FormData = z.infer<typeof schema>;

interface OnboardingClientProps {
  userId: string;
  initialName: string;
}

export function OnboardingClient({ userId, initialName }: OnboardingClientProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: initialName,
      monthly_goal_hours: 50,
      working_days: [], // Start empty so user has to choose
    },
  });

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    const supabase = createClient();
    
    // Upsert into supabase
    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      full_name: data.full_name,
      monthly_goal_hours: data.monthly_goal_hours,
      working_days: data.working_days,
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
        monthly_goal_hours: data.monthly_goal_hours,
        working_days: data.working_days,
        onboarding_completed: true,
      });
    } else {
      await db.profiles.add({
        id: userId,
        full_name: data.full_name,
        monthly_goal_hours: data.monthly_goal_hours,
        service_year_start_month: 9, // fallback default
        working_days: data.working_days,
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
    setStep(s => s + 1);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col justify-center max-w-md mx-auto p-4 gap-6">
      <div className="text-center space-y-2">
        <h1 className="font-display font-semibold text-3xl text-[var(--ink)]">
          Bem-vindo ao Kairós
        </h1>
        <p className="text-body text-[var(--ink-muted)]">
          Vamos configurar seu perfil rapidamente.
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2 text-[var(--primary)] mb-2">
                <User size={20} />
                <h2 className="text-subheading font-medium">Como podemos te chamar?</h2>
              </div>
              <Field label="Nome ou Apelido" htmlFor="full_name" error={errors.full_name?.message}>
                <Input
                  id="full_name"
                  placeholder="Seu nome"
                  {...register("full_name")}
                  autoFocus
                />
              </Field>
              <Button type="button" onClick={nextStep} size="lg" className="w-full">
                Continuar
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2 text-[var(--primary)] mb-2">
                <Target size={20} />
                <h2 className="text-subheading font-medium">Sua meta mensal</h2>
              </div>
              <p className="text-sm text-[var(--ink-muted)]">
                Quantas horas você planeja dedicar por mês?
              </p>
              <Field label="Horas" htmlFor="monthly_goal_hours" error={errors.monthly_goal_hours?.message}>
                <Input
                  id="monthly_goal_hours"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={300}
                  {...register("monthly_goal_hours")}
                  autoFocus
                />
              </Field>
              <div className="flex gap-3">
                <Button type="button" variant="secondary" size="lg" onClick={() => setStep(1)} className="flex-1">
                  Voltar
                </Button>
                <Button type="button" onClick={nextStep} size="lg" className="flex-1">
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2 text-[var(--primary)] mb-2">
                <CalendarDays size={20} />
                <h2 className="text-subheading font-medium">Dias de campo</h2>
              </div>
              <p className="text-sm text-[var(--ink-muted)]">
                Quais dias da semana você costuma sair no campo? Isso ajuda a calcular seu ritmo ideal.
              </p>
              
              <div className="flex flex-wrap justify-center gap-1 sm:gap-1.5 py-2 w-full max-w-full overflow-hidden">
                {DAYS_OF_WEEK.map((day) => {
                  const currentDays = watch("working_days") || [];
                  const isSelected = currentDays.includes(day.id);
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setValue("working_days", currentDays.filter(d => d !== day.id), { shouldValidate: true, shouldDirty: true });
                        } else {
                          setValue("working_days", [...currentDays, day.id].sort(), { shouldValidate: true, shouldDirty: true });
                        }
                      }}
                      className={`w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0 flex items-center justify-center rounded-full text-[11px] font-sans font-semibold transition-all ${
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
              
              <div className="flex gap-3 mt-4">
                <Button type="button" variant="secondary" size="lg" onClick={() => setStep(2)} className="flex-1">
                  Voltar
                </Button>
                <Button type="submit" variant="primary" size="lg" loading={saving} className="flex-1">
                  Concluir
                </Button>
              </div>
            </div>
          )}
        </form>
      </Card>
      
      {/* Indicador de passos */}
      <div className="flex justify-center gap-2 mt-4">
        {[1, 2, 3].map((i) => (
          <div 
            key={i} 
            className={`h-1.5 rounded-full transition-all duration-300 ${
              step >= i ? "w-8 bg-[var(--primary)]" : "w-2 bg-[var(--border)]"
            }`} 
          />
        ))}
      </div>
    </div>
  );
}
