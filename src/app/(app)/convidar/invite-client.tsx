"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Copy,
  Check,
  Share2,
  Users,
  QrCode,
  RefreshCw,
  Trash2,
  Sparkles,
  Clock,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AppHeader } from "@/components/layout/app-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";
import { PermissionsManagementSection } from "@/components/admin/permissions-management-section";
import { MemberCombobox, type MemberOption } from "@/components/pastoreio/member-combobox";
import { createClient } from "@/lib/supabase/client";

interface PendingInvite {
  id: string;
  member_id: string;
  expires_at: string;
  created_at: string;
  congregation_members: {
    id: string;
    full_name: string;
    appointment?: string | null;
    service_status?: string | null;
  };
}

interface InviteClientProps {
  currentUserId?: string;
}

export function InviteClient({ currentUserId }: InviteClientProps) {
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  // Convite gerado ativo
  const [generatedInvite, setGeneratedInvite] = useState<{
    url: string;
    memberName: string;
    qrDataUrl: string;
    expiresAt: string;
  } | null>(null);

  const [copied, setCopied] = useState(false);

  // Lista de convites pendentes
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Carregar lista de irmãos disponíveis (que NÃO possuem conta vinculada em profiles)
  const fetchAvailableMembers = useCallback(async () => {
    try {
      const supabase = createClient();

      // 1. Buscar todos os membros ativos
      const { data: allMembers } = await supabase
        .from("congregation_members")
        .select("id, full_name, appointment, service_status")
        .eq("active", true)
        .order("full_name", { ascending: true });

      // 2. Buscar quais membros já possuem conta vinculada em profiles
      const { data: boundProfiles } = await supabase
        .from("profiles")
        .select("member_id")
        .not("member_id", "is", null);

      const boundMemberIds = new Set(
        (boundProfiles || []).map((p) => p.member_id)
      );

      // 3. Filtrar somente os irmãos que ainda não possuem conta vinculada
      if (allMembers) {
        const available = allMembers.filter((m) => !boundMemberIds.has(m.id));
        setMembers(available as MemberOption[]);
      }
    } catch (err) {
      console.error("Erro ao carregar membros:", err);
    }
  }, []);

  // Carregar convites pendentes
  const fetchPendingInvites = useCallback(async () => {
    try {
      setLoadingPending(true);
      const res = await fetch("/api/invite", { method: "GET" });
      const data = await res.json();
      if (res.ok && data.invites) {
        setPendingInvites(data.invites);
      }
    } catch (err) {
      console.error("Erro ao carregar convites pendentes:", err);
    } finally {
      setLoadingPending(false);
    }
  }, []);

  useEffect(() => {
    fetchAvailableMembers();
    fetchPendingInvites();
  }, [fetchAvailableMembers, fetchPendingInvites]);

  // Gerar convite para um irmão selecionado
  const handleGenerateInvite = async (memberIdToGenerate?: string) => {
    const memberId = memberIdToGenerate || selectedMemberId;
    if (!memberId) {
      toast.error("Selecione um irmão da congregação.");
      return;
    }

    setLoading(true);
    setCopied(false);

    try {
      const origin = window.location.origin;
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId,
          origin,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Erro ao gerar convite.");
      }

      // Gerar QR Code nítido
      const qrDataUrl = await QRCode.toDataURL(result.inviteUrl, {
        width: 260,
        margin: 1.5,
        color: {
          dark: "#1E3A5F",
          light: "#FFFFFF",
        },
      });

      setGeneratedInvite({
        url: result.inviteUrl,
        memberName: result.memberName,
        qrDataUrl,
        expiresAt: result.expiresAt,
      });

      toast.success(`Convite gerado para ${result.memberName}!`);
      fetchPendingInvites();
    } catch (error: any) {
      toast.error(error.message || "Erro ao gerar convite.");
    } finally {
      setLoading(false);
    }
  };

  // Cancelar convite pendente
  const handleRevokeInvite = async (inviteId: string) => {
    try {
      setActionLoadingId(inviteId);
      const res = await fetch("/api/invite", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteId }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Erro ao cancelar convite.");
      }

      toast.success("Convite cancelado com sucesso.");

      // Se o convite cancelado for o que está no card, limpa
      if (generatedInvite) {
        setGeneratedInvite(null);
      }

      fetchPendingInvites();
    } catch (err: any) {
      toast.error(err.message || "Erro ao cancelar convite.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Compartilhar via WhatsApp
  const handleWhatsAppShare = () => {
    if (!generatedInvite) return;

    const message = `Olá, ${generatedInvite.memberName}! 😊 Aqui está o seu convite individual para acessar o ${APP_NAME} da nossa congregação. Toque no link para entrar com sua conta Google ou criar uma senha:\n${generatedInvite.url}`;

    if (navigator.share) {
      navigator.share({ text: message }).catch(() => {});
    } else {
      window.open(
        `https://wa.me/?text=${encodeURIComponent(message)}`,
        "_blank"
      );
    }
  };

  // Copiar link
  const handleCopy = () => {
    if (!generatedInvite) return;
    navigator.clipboard.writeText(generatedInvite.url);
    setCopied(true);
    toast.success("Link copiado para a área de transferência");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
      <AppHeader
        title="Permissões e Convites"
        subtitle="Gerenciamento de acessos da congregação"
      />

      {/* ─────────────────────────────────────────────────────────────
          1. CARD DE GERAÇÃO DE CONVITE ESTILO HOURGLASS
      ───────────────────────────────────────────────────────────── */}
      <Card className="rounded-[32px] sm:rounded-[36px] bg-[var(--panel)] p-6 sm:p-8 shadow-xs border border-[var(--border)]/70">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
            <Users size={16} />
          </div>
          <h2 className="font-display font-medium text-xl text-[var(--ink)]">
            Convidar Irmão da Congregação
          </h2>
        </div>

        <p className="text-sm text-[var(--ink-muted)] mb-6 leading-relaxed">
          Gere um convite individual com QR Code e link direto. O publicador poderá entrar com a conta Google ou criar uma senha, já com seu nome e permissões vinculados automaticamente.
        </p>

        {/* Seleção do Irmão (sem pedir e-mail) */}
        {!generatedInvite ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--ink)] uppercase tracking-wider">
                Selecione o irmão da congregação
              </label>
              <MemberCombobox
                members={members}
                value={selectedMemberId}
                onChange={setSelectedMemberId}
                placeholder="Pesquisar por nome ou designação..."
                emptyText="Nenhum irmão pendente encontrado"
              />
              <p className="text-xs text-[var(--ink-muted)]">
                Mostrando apenas os publicadores que ainda não têm conta ativa vinculada.
              </p>
            </div>

            <Button
              type="button"
              variant="primary"
              size="lg"
              loading={loading}
              disabled={!selectedMemberId}
              onClick={() => handleGenerateInvite()}
              className="w-full mt-2 rounded-full font-semibold shadow-xs flex items-center justify-center gap-2"
            >
              <Sparkles size={17} />
              <span>Gerar convite e QR Code</span>
            </Button>
          </div>
        ) : (
          /* ─────────────────────────────────────────────────────────
             2. CONVITE GERADO COM QR CODE NA TELA + WHATSAPP + COPIAR
          ───────────────────────────────────────────────────────── */
          <div className="animate-in fade-in slide-in-from-bottom-3 flex flex-col gap-6 pt-2">
            <div className="flex flex-col sm:flex-row items-center gap-6 p-5 sm:p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
              {/* QR Code nítido na tela */}
              <div className="p-3 bg-white rounded-2xl shadow-sm border border-black/5 shrink-0 flex flex-col items-center">
                <img
                  src={generatedInvite.qrDataUrl}
                  alt={`QR Code de convite para ${generatedInvite.memberName}`}
                  className="w-48 h-48 object-contain"
                />
                <span className="text-[11px] font-medium text-neutral-600 mt-1 flex items-center gap-1">
                  <QrCode size={12} />
                  Escaneie com a câmera
                </span>
              </div>

              {/* Informações e Detalhes */}
              <div className="flex-1 flex flex-col justify-between text-center sm:text-left min-w-0">
                <div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--success)]/15 text-[var(--success)] mb-2">
                    <Check size={12} strokeWidth={3} />
                    Convite ativo
                  </span>

                  <h3 className="font-display font-medium text-2xl text-[var(--ink)] leading-snug truncate">
                    {generatedInvite.memberName}
                  </h3>

                  <p className="text-xs text-[var(--ink-muted)] mt-1 flex items-center justify-center sm:justify-start gap-1">
                    <Clock size={13} />
                    <span>Válido por 7 dias (até {new Date(generatedInvite.expiresAt).toLocaleDateString("pt-BR")})</span>
                  </p>
                </div>

                {/* Caixa com o link para copiar */}
                <div className="mt-4 bg-[var(--background)] border border-[var(--border)] rounded-full pl-4 pr-1.5 py-1.5 flex items-center gap-2">
                  <p className="text-xs font-mono text-[var(--ink-muted)] truncate select-all flex-1">
                    {generatedInvite.url}
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleCopy}
                    className={`rounded-full shrink-0 h-8 px-3 text-xs transition-colors ${
                      copied
                        ? "bg-[var(--success)]/10 text-[var(--success)] border-transparent"
                        : ""
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check size={14} className="mr-1" />
                        <span>Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} className="mr-1" />
                        <span>Copiar link</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                type="button"
                variant="primary"
                size="lg"
                onClick={handleWhatsAppShare}
                className="w-full rounded-full font-semibold shadow-xs flex items-center justify-center gap-2"
              >
                <Send size={16} />
                <span>Enviar via WhatsApp</span>
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={() => {
                  setGeneratedInvite(null);
                  setSelectedMemberId(null);
                  fetchAvailableMembers();
                }}
                className="w-full rounded-full font-semibold text-[var(--ink)] hover:bg-black/5 dark:hover:bg-white/10"
              >
                Convidar outro irmão
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ─────────────────────────────────────────────────────────────
          3. LISTA DE CONVITES PENDENTES
      ───────────────────────────────────────────────────────────── */}
      <Card className="rounded-[32px] sm:rounded-[36px] bg-[var(--panel)] p-6 sm:p-8 shadow-xs border border-[var(--border)]/70">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
              <Clock size={16} />
            </div>
            <div>
              <h3 className="font-display font-medium text-lg text-[var(--ink)] leading-tight">
                Convites Pendentes
              </h3>
              <p className="text-xs text-[var(--ink-muted)]">
                Aguardando ativação pelo publicador
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={fetchPendingInvites}
            disabled={loadingPending}
            className="rounded-full text-xs text-[var(--ink-muted)] hover:text-[var(--ink)]"
          >
            <RefreshCw size={13} className={loadingPending ? "animate-spin" : ""} />
            <span className="ml-1 hidden sm:inline">Atualizar</span>
          </Button>
        </div>

        {pendingInvites.length === 0 ? (
          <div className="py-8 text-center text-sm text-[var(--ink-muted)] border border-dashed border-[var(--border)] rounded-2xl">
            Nenhum convite pendente no momento. Todos os convites foram ativados ou expiraram.
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-[var(--border)]/70">
            {pendingInvites.map((inv) => {
              const member = inv.congregation_members;
              const formattedExpiration = formatDistanceToNow(parseISO(inv.expires_at), {
                addSuffix: true,
                locale: ptBR,
              });

              return (
                <div
                  key={inv.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-[var(--ink)] truncate">
                        {member?.full_name || "Irmão"}
                      </span>
                      {member?.appointment === "anciao" && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
                          Ancião
                        </span>
                      )}
                      {member?.appointment === "servo_ministerial" && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500">
                          SM
                        </span>
                      )}
                      {member?.service_status === "pioneiro_regular" && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--accent)]/15 text-[var(--accent)]">
                          Pioneiro Regular
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[var(--ink-muted)] mt-0.5">
                      Expira {formattedExpiration}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleGenerateInvite(inv.member_id)}
                      disabled={loading}
                      className="rounded-full text-xs h-8 px-3 text-[var(--ink)] hover:bg-black/5 dark:hover:bg-white/10"
                    >
                      <QrCode size={13} className="mr-1.5 text-[var(--primary)]" />
                      <span>Novo link / QR Code</span>
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevokeInvite(inv.id)}
                      disabled={actionLoadingId === inv.id}
                      className="rounded-full text-xs h-8 px-2.5 text-[var(--ink-muted)] hover:text-[var(--alert)] hover:bg-red-500/10"
                      aria-label="Cancelar convite"
                      title="Cancelar convite"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ─────────────────────────────────────────────────────────────
          4. SEÇÃO DE GESTÃO DE PERMISSÕES EXISTENTE
      ───────────────────────────────────────────────────────────── */}
      <PermissionsManagementSection currentUserId={currentUserId} />
    </div>
  );
}
