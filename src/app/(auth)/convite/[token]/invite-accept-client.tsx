"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { APP_NAME } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";

const schema = z
  .object({
    email: z.string().email("Informe um e-mail válido"),
    password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
    confirmPassword: z.string().min(6, "Confirme sua senha"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

interface InviteAcceptClientProps {
  rawToken: string;
  member: {
    id: string;
    full_name: string;
    appointment?: string | null;
    service_status?: string | null;
  };
}

export function InviteAcceptClient({ rawToken, member }: InviteAcceptClientProps) {
  const router = useRouter();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  // Opção 1: Continuar com Google
  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);

      // Grava o token no cookie para redundância no callback OAuth
      document.cookie = `kairos_invite_token=${rawToken}; path=/; max-age=900; SameSite=Lax`;

      const supabase = createClient();
      const origin = window.location.origin;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback?invite=${encodeURIComponent(rawToken)}`,
        },
      });

      if (error) {
        toast.error("Erro ao iniciar login com Google. Tente novamente.");
        setGoogleLoading(false);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao conectar com Google.");
      setGoogleLoading(false);
    }
  };

  // Opção 2: Cadastro com E-mail e Senha
  const onSubmit = async (data: FormData) => {
    try {
      setFormLoading(true);

      const res = await fetch("/api/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: rawToken,
          email: data.email,
          password: data.password,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Não foi possível criar sua conta.");
      }

      toast.success(`Bem-vindo ao Kairós, ${member.full_name}!`);

      // Fazer login automático com as credenciais criadas
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (signInError) {
        // Se o sign in automático falhar, direciona para o login com mensagem
        toast.info("Conta criada com sucesso! Por favor, faça login.");
        router.push("/login");
        return;
      }

      router.push("/");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Erro ao registrar conta.");
      setFormLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-8 flex flex-col items-center">
      {/* Logo e Marca Kairós */}
      <div className="text-center mb-8 flex flex-col items-center">
        <Image
          src="/kairos-mark-transparent.svg"
          alt="Kairós"
          width={76}
          height={76}
          className="mb-3 object-contain"
          priority
        />
        <span className="font-display font-semibold text-2xl text-[var(--ink)]">
          {APP_NAME}
        </span>
      </div>

      <div className="rounded-[36px] bg-[var(--panel)] p-6 sm:p-9 shadow-xs border border-[var(--border)]/70 w-full flex flex-col">
        {/* Saudação com o nome do irmão em serifa */}
        <div className="text-center mb-6">
          <h1 className="font-display font-medium text-2xl sm:text-3xl text-[var(--ink)] tracking-tight">
            Olá, {member.full_name}
          </h1>
          <p className="text-sm text-[var(--ink-muted)] mt-1.5 leading-relaxed">
            Seu acesso ao Kairós está pronto. Escolha como prefere entrar:
          </p>
        </div>

        {/* Opção 1: Botão Google */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || formLoading}
          className="w-full h-12 rounded-full bg-[var(--surface)] hover:bg-black/5 dark:hover:bg-white/10 text-[var(--ink)] font-semibold text-sm border border-[var(--border)] flex items-center justify-center gap-3 shadow-xs cursor-pointer active:scale-[0.98] transition-all disabled:opacity-50"
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
          <span>{googleLoading ? "Conectando ao Google..." : "Continuar com Google"}</span>
        </button>

        {/* Divisor sutil */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--border)]" />
          </div>
          <span className="relative px-3 bg-[var(--panel)] text-xs text-[var(--ink-muted)]">
            ou crie com e-mail e senha
          </span>
        </div>

        {/* Opção 2: Formulário de e-mail e senha */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <Field label="Seu e-mail" htmlFor="email" error={errors.email?.message}>
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
            label="Criar uma senha"
            htmlFor="password"
            hint="Mínimo 6 caracteres"
            error={errors.password?.message}
          >
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              error={!!errors.password}
              {...register("password")}
            />
          </Field>

          <Field
            label="Confirmar senha"
            htmlFor="confirmPassword"
            error={errors.confirmPassword?.message}
          >
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              error={!!errors.confirmPassword}
              {...register("confirmPassword")}
            />
          </Field>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={formLoading}
            disabled={googleLoading}
            className="w-full mt-2 rounded-full font-semibold shadow-xs"
          >
            Criar conta e acessar
          </Button>
        </form>
      </div>

      <p className="text-center text-xs text-[var(--ink-muted)] mt-6">
        Kairós • Gestão Pessoal e Pastoral da Congregação
      </p>
    </div>
  );
}
