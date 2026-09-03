"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Copy, Check, Share2, Users } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/layout/app-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { APP_NAME } from "@/lib/constants";

const schema = z.object({
  email: z.string().email("E-mail inválido"),
});

type FormData = z.infer<typeof schema>;

export function InviteClient() {
  const [loading, setLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setInviteUrl(null);
    setCopied(false);
    
    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Erro ao gerar convite");
      }

      setInviteUrl(result.inviteUrl);
      toast.success("Link gerado com sucesso!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!inviteUrl) return;

    const message = `Olá! 😊 Te convidei para usar o ${APP_NAME}, o app que uso para registrar meu serviço de campo. Entra por aqui para criar sua conta:\n${inviteUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({ text: message });
      } catch {
        // user canceled or unsupported, fail silently
      }
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
    }
  };

  const handleCopy = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success("Link copiado para a área de transferência");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-5">
      <AppHeader title="Convidar" subtitle="Gerenciar acessos" />

      <Card>
        <div className="flex items-center gap-2 mb-2">
          <Users size={18} className="text-[var(--primary)]" />
          <h2 className="text-subheading text-[var(--ink)]">Novo Convite</h2>
        </div>
        <p className="text-body-sm text-[var(--ink-muted)] mb-5">
          Gere um link mágico para convidar alguém. Nenhum e-mail será enviado automaticamente, você deve compartilhar o link gerado via WhatsApp.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <Field label="E-mail do convidado" htmlFor="email" error={errors.email?.message} required>
            <Input
              id="email"
              type="email"
              placeholder="email@exemplo.com"
              error={!!errors.email}
              {...register("email")}
            />
          </Field>

          <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
            <Mail size={18} className="mr-2" />
            Gerar Link de Convite
          </Button>
        </form>

        {inviteUrl && (
          <div className="mt-8 pt-6 border-t border-[var(--border)] animate-in fade-in slide-in-from-bottom-4 flex flex-col gap-5">
            <div className="flex flex-col items-center text-center gap-1.5">
              <div className="w-12 h-12 rounded-full bg-[var(--success)]/15 flex items-center justify-center text-[var(--success)] mb-1">
                <Check strokeWidth={3} size={24} />
              </div>
              <h3 className="text-subheading text-[var(--ink)]">Convite gerado!</h3>
              <p className="text-body-sm text-[var(--ink-muted)] px-2">
                Copie o link abaixo ou compartilhe diretamente com o novo usuário.
              </p>
            </div>
            
            <div className="bg-[var(--background)] border border-[var(--border)] rounded-xl p-3 flex items-center gap-3">
              <div className="flex-1 overflow-hidden pl-1">
                <p className="text-[13px] font-mono text-[var(--ink-muted)] truncate select-all">
                  {inviteUrl}
                </p>
              </div>
              <Button 
                type="button" 
                variant="secondary" 
                size="icon" 
                onClick={handleCopy} 
                className={`flex-shrink-0 w-9 h-9 rounded-full transition-colors ${copied ? 'bg-[var(--success)]/10 text-[var(--success)] border-transparent' : ''}`}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </Button>
            </div>

            <div className="flex flex-col gap-2 mt-1">
              <Button type="button" variant="primary" size="lg" onClick={handleShare} className="w-full shadow-sm">
                <Share2 size={18} className="mr-2" />
                Compartilhar
              </Button>

              <Button type="button" variant="ghost" size="lg" onClick={() => {
                setInviteUrl(null);
                reset();
              }} className="w-full text-[var(--ink-muted)] hover:text-[var(--ink)]">
                Gerar outro convite
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
