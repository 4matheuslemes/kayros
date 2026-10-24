"use client";

import { useState, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { APP_NAME } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { AlertCircle } from "lucide-react";

const schema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha muito curta"),
});

type FormData = z.infer<typeof schema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      const supabase = createClient();
      const origin = window.location.origin;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback`,
        },
      });

      if (error) {
        toast.error("Erro ao iniciar login com Google.");
        setGoogleLoading(false);
      }
    } catch {
      toast.error("Erro ao conectar com Google.");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      {/* Logo area */}
      <div className="text-center mb-8 flex flex-col items-center">
        <Image
          src="/kairos-mark-transparent.svg"
          alt="Kairós"
          width={80}
          height={80}
          className="mb-4 object-contain"
          priority
        />
        <h1 className="font-display font-semibold text-3xl text-[var(--ink)]">
          {APP_NAME}
        </h1>
        <p className="text-caption text-[var(--ink-muted)] mt-1">
          Acompanhe seu serviço com propósito
        </p>
      </div>

      {/* Alerta de acesso exclusivo para membros convidados */}
      {errorParam === "invite_required" && (
        <div className="mb-5 p-3.5 rounded-2xl bg-[var(--alert)]/10 border border-[var(--alert)]/20 flex items-start gap-2.5 text-xs text-[var(--alert)] animate-in fade-in">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Acesso exclusivo para convidados:</strong> O Kairós é restrito aos publicadores cadastrados na congregação. Solicite seu link de convite a um ancião.
          </div>
        </div>
      )}

      {errorParam === "auth_failed" && (
        <div className="mb-5 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-2.5 text-xs text-red-500 animate-in fade-in">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            Não foi possível concluir o login com o Google. Tente novamente ou use seu e-mail e senha.
          </div>
        </div>
      )}

      {/* Botão Google */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={googleLoading || loading}
        className="w-full h-12 rounded-full bg-[var(--surface)] hover:bg-black/5 dark:hover:bg-white/10 text-[var(--ink)] font-semibold text-sm border border-[var(--border)] flex items-center justify-center gap-3 shadow-xs cursor-pointer active:scale-[0.98] transition-all disabled:opacity-50 mb-4"
      >
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>{googleLoading ? "Conectando ao Google..." : "Entrar com Google"}</span>
      </button>

      {/* Divisor sutil */}
      <div className="relative my-4 text-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--border)]" />
        </div>
        <span className="relative px-3 bg-[var(--background)] text-xs text-[var(--ink-muted)]">
          ou com e-mail e senha
        </span>
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
          disabled={googleLoading}
          className="mt-2 w-full rounded-full font-semibold shadow-xs"
        >
          Entrar
        </Button>
      </form>

      <p className="text-center text-caption text-[var(--ink-muted)] mt-8">
        Acesso restrito aos membros da congregação
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-sm text-center py-12 text-[var(--ink-muted)]">Carregando...</div>}>
      <LoginForm />
    </Suspense>
  );
}
