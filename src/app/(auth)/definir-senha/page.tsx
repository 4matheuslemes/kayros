"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { APP_NAME } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";

const schema = z.object({
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof schema>;

export default function SetPasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    
    const checkAuth = async () => {
      // 1. Check existing session
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCheckingAuth(false);
        return;
      }
      
      // 2. If no session, try to parse the hash manually
      const hash = window.location.hash;
      if (hash && hash.includes("access_token")) {
        // Next.js sometimes preserves the hash but Supabase client misses it on fast mounts
        const params = new URLSearchParams(hash.replace("#", "?"));
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (!error) {
            setCheckingAuth(false);
            // Clean up the URL
            window.history.replaceState(null, "", window.location.pathname);
            return;
          }
        }
      }
      
      // 3. Fallback: if no hash and no session, redirect out
      if (!window.location.hash.includes('access_token') && !window.location.hash.includes('type=invite')) {
        toast.error("Sessão inválida. O link pode ter expirado.");
        router.push("/login");
      }
    };
    
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        setCheckingAuth(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    const supabase = createClient();
    
    const { error } = await supabase.auth.updateUser({
      password: data.password,
    });
    
    if (error) {
      toast.error("Erro ao definir senha. Tente novamente.");
      setLoading(false);
      return;
    }
    
    toast.success("Senha cadastrada com sucesso!");
    router.push("/");
    router.refresh();
  };

  if (checkingAuth) {
    return (
      <div className="w-full max-w-sm flex items-center justify-center h-40 text-[var(--ink-muted)] text-sm">
        Validando convite...
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      {/* Logo area */}
      <div className="text-center mb-10 flex flex-col items-center">
        <Image
          src="/kairos-mark-transparent.svg"
          alt="Kairós"
          width={80}
          height={80}
          className="mb-4"
          priority
        />
        <h1 className="font-display font-semibold text-3xl text-[var(--ink)]">
          Bem-vindo!
        </h1>
        <p className="text-caption text-[var(--ink-muted)] mt-1 px-4">
          Para acessar sua conta, crie uma senha segura abaixo.
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        <Field
          label="Nova senha"
          htmlFor="password"
          error={errors.password?.message}
        >
          <Input
            id="password"
            type="password"
            placeholder="Mínimo de 6 caracteres"
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
            placeholder="Repita a senha"
            error={!!errors.confirmPassword}
            {...register("confirmPassword")}
          />
        </Field>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={loading}
          className="mt-4 w-full shadow-sm"
        >
          Salvar senha e entrar
        </Button>
      </form>
    </div>
  );
}
