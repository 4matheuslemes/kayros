import Image from "next/image";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { APP_NAME } from "@/lib/constants";
import { InviteAcceptClient } from "./invite-accept-client";
import { AlertCircle } from "lucide-react";

interface ConvitePageProps {
  params: Promise<{ token: string }>;
}

export default async function ConvitePage({ params }: ConvitePageProps) {
  const { token } = await params;

  if (!token) {
    return <InvalidInviteView message="O link de convite fornecido é inválido." />;
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const tokenHash = crypto
    .createHash("sha256")
    .update(token.trim())
    .digest("hex");

  // Buscar convite no banco de dados
  const { data: invite, error } = await supabaseAdmin
    .from("member_invites")
    .select(`
      id,
      member_id,
      expires_at,
      used_at,
      congregation_members (id, full_name, appointment, service_status)
    `)
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !invite) {
    return (
      <InvalidInviteView message="Este convite não foi encontrado. Solicite um novo link a um administrador da congregação." />
    );
  }

  if (invite.used_at) {
    return (
      <InvalidInviteView message="Este convite já foi utilizado para criar ou vincular uma conta. Se você já possui uma senha, faça login." />
    );
  }

  if (new Date(invite.expires_at).getTime() <= Date.now()) {
    return (
      <InvalidInviteView message="Este convite expirou (validade de 7 dias). Solicite um novo convite a um administrador da congregação." />
    );
  }

  // Verificar se o irmão já possui outro perfil vinculado
  const { data: existingProfile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("member_id", invite.member_id)
    .maybeSingle();

  if (existingProfile) {
    return (
      <InvalidInviteView message="Este irmão já possui uma conta ativa no Kairós. Se você já configurou sua senha, faça login." />
    );
  }

  const member = Array.isArray(invite.congregation_members)
    ? invite.congregation_members[0]
    : invite.congregation_members;

  if (!member) {
    return (
      <InvalidInviteView message="Não foi possível localizar os dados do membro associado a este convite." />
    );
  }

  return <InviteAcceptClient rawToken={token} member={member} />;
}

function InvalidInviteView({ message }: { message: string }) {
  return (
    <div className="w-full max-w-md mx-auto text-center px-4 py-8 flex flex-col items-center">
      <div className="mb-6 flex flex-col items-center">
        <Image
          src="/kairos-mark-transparent.svg"
          alt="Kairós"
          width={72}
          height={72}
          className="mb-3 object-contain"
          priority
        />
        <span className="font-display font-semibold text-2xl text-[var(--ink)]">
          {APP_NAME}
        </span>
      </div>

      <div className="rounded-[32px] bg-[var(--panel)] p-7 sm:p-9 shadow-xs border border-[var(--border)]/70 w-full flex flex-col items-center">
        <div className="w-12 h-12 rounded-full bg-[var(--alert)]/15 text-[var(--alert)] flex items-center justify-center mb-4">
          <AlertCircle size={24} />
        </div>

        <h2 className="font-display font-medium text-xl text-[var(--ink)] mb-2">
          Convite não disponível
        </h2>

        <p className="text-sm text-[var(--ink-muted)] leading-relaxed mb-6">
          {message}
        </p>

        <Link
          href="/login"
          className="inline-flex items-center justify-center w-full h-12 rounded-full bg-[var(--primary)] text-white text-sm font-semibold hover:opacity-95 active:scale-95 transition-all shadow-xs"
        >
          Ir para a tela de login
        </Link>
      </div>
    </div>
  );
}
