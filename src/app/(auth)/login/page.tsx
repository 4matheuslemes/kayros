"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { BookOpen } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { APP_NAME } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";

const schema = z.object({
  email:    z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha muito curta"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    if (error) {
      toast.error("Credenciais inválidas. Verifique e tente novamente.");
      setLoading(false);
      return;
    }
    router.push("/");
    router.refresh();
  };

  return (
    <div className="w-full max-w-sm">
      {/* Logo area */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--primary)] mb-5 shadow-card">
          <BookOpen size={28} className="text-white" />
        </div>
        <h1 className="font-display font-semibold text-2xl text-[var(--ink)]">
          {APP_NAME}
        </h1>
        <p className="text-caption text-[var(--ink-muted)] mt-1">
          Acompanhe seu serviço com propósito
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        <Field
          label="E-mail"
          htmlFor="email"
          error={errors.email?.message}
        >
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="seu@email.com"
            error={!!errors.email}
            {...register("email")}
          />
        </Field>

        <Field
          label="Senha"
          htmlFor="password"
          error={errors.password?.message}
        >
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            error={!!errors.password}
            {...register("password")}
          />
        </Field>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={loading}
          className="mt-2 w-full"
        >
          Entrar
        </Button>
      </form>

      <p className="text-center text-caption text-[var(--ink-muted)] mt-8">
        Acesso restrito ao titular da conta
      </p>
    </div>
  );
}
