"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowRight,
  Calendar,
  Users,
  Share2,
  BookOpenText,
  ShieldCheck,
  Clock,
  Plus,
} from "lucide-react";
import { NavMenu } from "@/components/layout/nav-menu";
import { SyncStatusIndicator } from "@/components/layout/sync-status-indicator";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { DailyEncouragement } from "@/components/dashboard/daily-encouragement";
import { HoursRegistrationCard } from "@/components/dashboard/hours-registration-card";
import { MonthlyGoalCard } from "@/components/dashboard/monthly-goal-card";
import { AgendaCalendar } from "@/components/dashboard/agenda-calendar";
import { PastoralVisualCard } from "@/components/dashboard/pastoral-visual-card";
import { ReleaseNotesModal } from "@/components/dashboard/release-notes-modal";
import { Drawer } from "@/components/ui/drawer";
import { ManualEntryForm } from "@/components/hours/manual-entry-form";
import { Reveal } from "@/components/ui/reveal";
import { useDashboardData } from "@/lib/db/hooks";
import { calculateMonthlyGoal } from "@/lib/goals/calculate-monthly-goal";
import { formatHours } from "@/lib/format";
import { formatRelativeDate, cn } from "@/lib/utils";
import { minutesFromWords } from "@/lib/discursos/outline-utils";
import type { Profile } from "@/lib/db/dexie";
import { useUserPermissions } from "@/contexts/user-permissions-context";
import type { UserPermissions } from "@/lib/permissions";
import type { MyGroupInfo } from "@/components/dashboard/my-service-group-card";

interface DashboardClientProps {
  userId: string;
  profile: Profile;
  permissions?: UserPermissions;
  myGroupInfo?: MyGroupInfo | null;
  pastoralData?: {
    dueCount: number;
    totalActive?: number;
    dueMembers?: Array<{ id: string; name: string }>;
    latestVisit: {
      family_or_person: string;
      visit_date: string;
      created_by_name?: string | null;
    } | null;
  } | null;
  latestOutline?: {
    id: string;
    title: string;
    category: string | null;
    updated_at: string;
    word_count: number;
  } | null;
}

export function DashboardClient({
  userId,
  profile,
  permissions: propPermissions,
  myGroupInfo,
  pastoralData,
  latestOutline,
}: DashboardClientProps) {
  const contextPermissions = useUserPermissions();
  const perms = propPermissions ?? contextPermissions;

  const [desktopManualOpen, setDesktopManualOpen] = useState(false);

  const { totalMinutes, contacts, refresh } = useDashboardData(userId);

  const revisitas = contacts.filter((c) => c.status === "revisita").length;
  const estudosAtivos = contacts.filter((c) => c.status === "estudo_ativo").length;

  const firstName = profile.full_name.split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const currentMonthName = format(new Date(), "MMMM", { locale: ptBR });

  // Goal calculation for Bloco 1
  const goalCalc = useMemo(() => {
    return calculateMonthlyGoal({
      today: new Date(),
      hoursGoal: profile.monthly_goal_hours,
      hoursDone: totalMinutes / 60,
      workingDays: profile.working_days ?? [1, 2, 3, 4, 5, 6, 7],
      weeklySchedule: profile.weekly_schedule,
    });
  }, [profile.monthly_goal_hours, totalMinutes, profile.working_days, profile.weekly_schedule]);

  const hoursDoneFormatted = formatHours(totalMinutes / 60);

  // Footer links in serif
  const footerNavLinks = [
    { href: "/", label: "Início", allowed: true },
    { href: "/contatos", label: "Interessados", allowed: perms.canUseContacts },
    { href: "/historico", label: "Histórico", allowed: perms.canUseHours },
    { href: "/discursos", label: "Discursos", allowed: perms.canUseTalks },
    { href: "/irmaos", label: "Irmãos e Grupos", allowed: perms.canViewMembers },
    { href: "/pastoreio", label: "Pastoreio", allowed: perms.canUseShepherding },
    { href: "/perfil", label: "Perfil", allowed: true },
    { href: "/convidar", label: "Permissões", allowed: perms.isElderOrAdmin },
  ].filter((l) => l.allowed);

  const handleShareLetterInvite = async () => {
    if (!profile.meeting_link) return;
    const message = `Olá! 😊 Que tal escrevermos algumas cartas juntos? Entra na nossa videochamada quando puder:\n${profile.meeting_link}`;
    if (navigator.share) {
      try {
        await navigator.share({ text: message });
      } catch {
        // user canceled or unsupported
      }
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
    }
  };

  // Count active modules for desktop hero grid layout
  const desktopModuleCount =
    (perms.canUseTalks ? 1 : 0) +
    (perms.canUseShepherding || perms.canViewMembers ? 1 : 0) +
    (perms.canUseContacts ? 1 : 0);

  // Dynamic Scroll Statement (Ato 2)
  const dueCount = pastoralData?.dueCount ?? 0;
  const totalActive = pastoralData?.totalActive ?? 0;
  const hasContacts = revisitas > 0 || estudosAtivos > 0;

  const renderContactsPills = () => {
    if (revisitas > 0 && estudosAtivos > 0) {
      return (
        <>
          <span className="inline-flex items-center px-3.5 py-0.5 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] font-semibold text-[0.8em] align-middle mx-1">
            {revisitas} {revisitas === 1 ? "revisita" : "revisitas"}
          </span>{" "}
          e{" "}
          <span className="inline-flex items-center px-3.5 py-0.5 rounded-full bg-[var(--success)]/15 text-[var(--success)] font-semibold text-[0.8em] align-middle mx-1">
            {estudosAtivos} {estudosAtivos === 1 ? "estudo ativo" : "estudos ativos"}
          </span>
        </>
      );
    }
    if (revisitas > 0) {
      return (
        <span className="inline-flex items-center px-3.5 py-0.5 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] font-semibold text-[0.8em] align-middle mx-1">
          {revisitas} {revisitas === 1 ? "revisita" : "revisitas"}
        </span>
      );
    }
    if (estudosAtivos > 0) {
      return (
        <span className="inline-flex items-center px-3.5 py-0.5 rounded-full bg-[var(--success)]/15 text-[var(--success)] font-semibold text-[0.8em] align-middle mx-1">
          {estudosAtivos} {estudosAtivos === 1 ? "estudo ativo" : "estudos ativos"}
        </span>
      );
    }
    return null;
  };

  const renderStatement = () => {
    // ─────────────────────────────────────────────────────────────
    // CASO A — Ancião / Autorizado em Pastoreio que NÃO é Pioneiro
    // (!canUseHours && canUseShepherding)
    // ─────────────────────────────────────────────────────────────
    if (!perms.canUseHours && perms.canUseShepherding) {
      return (
        <>
          {myGroupInfo ? (
            <>
              Você serve junto ao grupo{" "}
              <span className="inline-flex items-center px-3.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[var(--ink)] font-semibold text-[0.8em] align-middle mx-1">
                {myGroupInfo.name}
              </span>
              {myGroupInfo.meeting_info ? ` (${myGroupInfo.meeting_info})` : ""}
              , acompanha o cuidado pastoral da congregação com{" "}
            </>
          ) : (
            <>Você acompanha o cuidado pastoral da congregação com </>
          )}

          {dueCount > 0 ? (
            <span className="inline-flex items-center px-3.5 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 font-semibold text-[0.8em] align-middle mx-1">
              {dueCount} {dueCount === 1 ? "irmão na hora de visitar" : "irmãos na hora de visitar"}
            </span>
          ) : (
            <span className="inline-flex items-center px-3.5 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] font-semibold text-[0.8em] align-middle mx-1">
              {totalActive > 0 ? `${totalActive} ${totalActive === 1 ? "irmão" : "irmãos"}` : "os irmãos"} nos grupos de serviço
            </span>
          )}

          {hasContacts && (
            <>
              , e cuida de {renderContactsPills()} na sua agenda
            </>
          )}

          <Link
            href="/pastoreio"
            className="inline-flex items-center justify-center w-10 h-10 lg:w-11 lg:h-11 rounded-full bg-[var(--primary)] text-white hover:opacity-90 active:scale-95 transition-all align-middle ml-2 shadow-sm"
            aria-label="Ver pastoreio"
            title="Ver pastoreio"
          >
            <ArrowRight size={18} strokeWidth={2.25} />
          </Link>
          .
        </>
      );
    }

    // ─────────────────────────────────────────────────────────────
    // CASO B — Pioneiro + Ancião
    // (canUseHours && canUseShepherding)
    // ─────────────────────────────────────────────────────────────
    if (perms.canUseHours && perms.canUseShepherding) {
      return (
        <>
          Você já dedicou{" "}
          <span className="inline-flex items-center px-3.5 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] font-semibold text-[0.8em] align-middle mx-1">
            {hoursDoneFormatted}
          </span>{" "}
          ao ministério neste mês
          {hasContacts && <>, acompanha {renderContactsPills()}</>}
          {myGroupInfo && (
            <>
              , faz parte do grupo{" "}
              <span className="inline-flex items-center px-3.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[var(--ink)] font-semibold text-[0.8em] align-middle mx-1">
                {myGroupInfo.name}
              </span>
            </>
          )}
          {dueCount > 0 ? (
            <>
              , e cuida de{" "}
              <span className="inline-flex items-center px-3.5 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 font-semibold text-[0.8em] align-middle mx-1">
                {dueCount} {dueCount === 1 ? "irmão na hora de visitar" : "irmãos na hora de visitar"}
              </span>{" "}
              no pastoreio
            </>
          ) : (
            <>
              , e acompanha o cuidado pastoral com{" "}
              <span className="inline-flex items-center px-3.5 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] font-semibold text-[0.8em] align-middle mx-1">
                {totalActive > 0 ? `${totalActive} ${totalActive === 1 ? "irmão" : "irmãos"}` : "o rebanho"}
              </span>{" "}
              nos grupos
            </>
          )}
          <Link
            href="/pastoreio"
            className="inline-flex items-center justify-center w-10 h-10 lg:w-11 lg:h-11 rounded-full bg-[var(--primary)] text-white hover:opacity-90 active:scale-95 transition-all align-middle ml-2 shadow-sm"
            aria-label="Ver pastoreio"
            title="Ver pastoreio"
          >
            <ArrowRight size={18} strokeWidth={2.25} />
          </Link>
          .
        </>
      );
    }

    // ─────────────────────────────────────────────────────────────
    // CASO C — Pioneiro Regular (não é ancião)
    // (canUseHours && !canUseShepherding)
    // ─────────────────────────────────────────────────────────────
    if (perms.canUseHours && !perms.canUseShepherding) {
      return (
        <>
          Você já dedicou{" "}
          <span className="inline-flex items-center px-3.5 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] font-semibold text-[0.8em] align-middle mx-1">
            {hoursDoneFormatted}
          </span>{" "}
          ao ministério neste mês
          {hasContacts ? (
            <>, acompanha {renderContactsPills()}</>
          ) : goalCalc.hoursRemaining <= 0 ? (
            <>
              , com sua{" "}
              <span className="inline-flex items-center px-3.5 py-0.5 rounded-full bg-[var(--success)]/15 text-[var(--success)] font-semibold text-[0.8em] align-middle mx-1">
                meta concluída ✦
              </span>
            </>
          ) : (
            <>
              , com{" "}
              <span className="inline-flex items-center px-3.5 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] font-semibold text-[0.8em] align-middle mx-1">
                {formatHours(goalCalc.hoursRemaining)} restantes
              </span>{" "}
              para concluir sua meta de {currentMonthName}
            </>
          )}
          {myGroupInfo && (
            <>
              , e faz parte do grupo{" "}
              <span className="inline-flex items-center px-3.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[var(--ink)] font-semibold text-[0.8em] align-middle mx-1">
                {myGroupInfo.name}
              </span>
            </>
          )}
          <Link
            href="/historico"
            className="inline-flex items-center justify-center w-10 h-10 lg:w-11 lg:h-11 rounded-full bg-[var(--primary)] text-white hover:opacity-90 active:scale-95 transition-all align-middle ml-2 shadow-sm"
            aria-label="Ver histórico completo"
            title="Ver histórico"
          >
            <ArrowRight size={18} strokeWidth={2.25} />
          </Link>
          .
        </>
      );
    }

    // ─────────────────────────────────────────────────────────────
    // CASO D — Publicador / Servo sem horas de pioneiro e sem pastoreio
    // (!canUseHours && !canUseShepherding)
    // ─────────────────────────────────────────────────────────────
    if (hasContacts) {
      return (
        <>
          Você acompanha {renderContactsPills()} na sua agenda
          {myGroupInfo && (
            <>
              , e serve junto ao grupo{" "}
              <span className="inline-flex items-center px-3.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[var(--ink)] font-semibold text-[0.8em] align-middle mx-1">
                {myGroupInfo.name}
              </span>
              {myGroupInfo.meeting_info ? ` (${myGroupInfo.meeting_info})` : ""}
            </>
          )}
          <Link
            href="/contatos"
            className="inline-flex items-center justify-center w-10 h-10 lg:w-11 lg:h-11 rounded-full bg-[var(--primary)] text-white hover:opacity-90 active:scale-95 transition-all align-middle ml-2 shadow-sm"
            aria-label="Ver interessados"
            title="Ver interessados"
          >
            <ArrowRight size={18} strokeWidth={2.25} />
          </Link>
          .
        </>
      );
    }

    // Subcaso D2: 0 revisitas e 0 estudos — frase limpa e acolhedora sem zeros!
    const defaultTargetHref = perms.canUseTalks
      ? "/discursos"
      : perms.canViewMembers
      ? "/irmaos"
      : "/contatos";

    return (
      <>
        {myGroupInfo ? (
          <>
            Você serve junto ao grupo{" "}
            <span className="inline-flex items-center px-3.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[var(--ink)] font-semibold text-[0.8em] align-middle mx-1">
              {myGroupInfo.name}
            </span>
            {myGroupInfo.meeting_info ? ` (${myGroupInfo.meeting_info})` : ""}{" "}
            e tem este espaço pronto para organizar sua{" "}
          </>
        ) : (
          <>Você tem este espaço pronto para organizar sua </>
        )}
        <span className="inline-flex items-center px-3.5 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] font-semibold text-[0.8em] align-middle mx-1">
          agenda de ministério
        </span>
        {perms.canUseTalks && (
          <>
            {" "}
            e seus{" "}
            <span className="inline-flex items-center px-3.5 py-0.5 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] font-semibold text-[0.8em] align-middle mx-1">
              esboços de discursos
            </span>
          </>
        )}
        <Link
          href={defaultTargetHref}
          className="inline-flex items-center justify-center w-10 h-10 lg:w-11 lg:h-11 rounded-full bg-[var(--primary)] text-white hover:opacity-90 active:scale-95 transition-all align-middle ml-2 shadow-sm"
          aria-label="Acessar painel"
          title="Acessar painel"
        >
          <ArrowRight size={18} strokeWidth={2.25} />
        </Link>
        .
      </>
    );
  };

  return (
    <div className="flex flex-col gap-12 lg:gap-20">
      {/* ─────────────────────────────────────────────────────────────
          ATO 1 — O Grande Cartão de Topo (Hero Moldurado)
      ───────────────────────────────────────────────────────────── */}
      <Reveal delayMs={0}>
        <section
          className={cn(
            "rounded-[28px] lg:rounded-[36px]",
            "max-w-[1240px] mx-auto w-full",
            "bg-[linear-gradient(180deg,var(--hero-from)_0%,var(--hero-via)_60%,var(--hero-to)_100%)]",
            "p-5 sm:p-8 lg:p-12",
            "border border-[var(--border)]/40 shadow-xs",
            "flex flex-col"
          )}
          aria-label="Hero editorial de boas-vindas"
        >
          {/* Cabeçalho dentro do Hero: Marca Kairós à esquerda + Menu azul-marinho à direita */}
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2.5 group">
              <Image
                src="/kairos-mark-transparent.svg"
                alt="Kairós"
                width={28}
                height={28}
                className="w-7 h-7 object-contain"
                priority
              />
              <span className="font-display font-semibold text-2xl lg:text-3xl tracking-tight text-[var(--ink)]">
                Kairós
              </span>
            </Link>

            <div className="flex items-center gap-3">
              <NavMenu />
            </div>
          </div>

          {/* Título Gigante Centralizado */}
          <div className="text-center max-w-3xl mx-auto mt-10 lg:mt-14">
            <h1
              className="font-display font-normal text-[var(--ink)] tracking-[-0.035em] leading-[1]"
              style={{ fontSize: "clamp(2.75rem, 7vw, 5rem)" }}
            >
              {greeting}, {firstName}
            </h1>
            <div className="mt-4 max-w-xl mx-auto">
              <DailyEncouragement className="text-center text-base lg:text-lg text-[var(--ink-muted)] leading-relaxed" />
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────
              A) NO MOBILE (< 1024px): Foco em Campo
              O Registro de Tempo é o protagonista no topo, seguindo
              fielmente o padrão visual do Meta do Mês e da Agenda
          ───────────────────────────────────────────────────────── */}
          <div className="lg:hidden max-w-xl mx-auto w-full mt-8">
            {perms.canUseHours ? (
              <HoursRegistrationCard
                userId={userId}
                onRecordSaved={refresh}
              />
            ) : (
              <AgendaCalendar
                userId={userId}
                profile={profile}
              />
            )}
          </div>

          {/* ─────────────────────────────────────────────────────────
              B) NO DESKTOP (>= 1024px): Central de Mesa / Preparação
              Trabalho de mesa em destaque + horas como coadjuvante discreto
          ───────────────────────────────────────────────────────── */}
          <div
            className={cn(
              "hidden lg:flex flex-col gap-6",
              "rounded-[40px]",
              "bg-[var(--surface)] dark:bg-[#121A29]",
              "p-8 lg:p-9",
              "shadow-xs border border-black/5 dark:border-white/10",
              "max-w-4xl mx-auto w-full mt-12"
            )}
          >
              {/* Grid de trabalho de mesa (Discursos, Pastoreio/Irmãos, Estudos) */}
              <div
                className={cn(
                  "grid gap-5 items-stretch",
                  desktopModuleCount >= 3
                    ? "grid-cols-3"
                    : desktopModuleCount === 2
                    ? "grid-cols-2"
                    : "grid-cols-1"
                )}
              >
                {/* 1. DISCURSOS: Preparação e Estudo (se canUseTalks) */}
                {perms.canUseTalks && (
                  <div className="rounded-[24px] bg-[var(--panel)] p-5 flex flex-col justify-between border border-[var(--border)]/60 hover:border-[var(--primary)]/40 transition-colors">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
                            <BookOpenText size={16} />
                          </div>
                          <span className="text-xs font-semibold text-[var(--ink)] uppercase tracking-wider">
                            Discursos
                          </span>
                        </div>
                        {latestOutline && (
                          <span className="text-[11px] font-medium text-[var(--ink-muted)] bg-[var(--surface)] px-2.5 py-0.5 rounded-full border border-[var(--border)]/60">
                            ~{minutesFromWords(latestOutline.word_count)} min
                          </span>
                        )}
                      </div>

                      {latestOutline ? (
                        <div className="flex flex-col gap-1 mt-2">
                          <h4 className="font-display font-semibold text-base text-[var(--ink)] leading-snug line-clamp-2">
                            {latestOutline.title}
                          </h4>
                          <p className="text-xs text-[var(--ink-muted)] mt-1">
                            {latestOutline.category || "Esboço de discurso"} • Editado{" "}
                            {formatRelativeDate(latestOutline.updated_at)}
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1 mt-2">
                          <h4 className="font-display font-semibold text-base text-[var(--ink)] leading-snug">
                            Preparação de Discursos
                          </h4>
                          <p className="text-xs text-[var(--ink-muted)] mt-1">
                            Crie e edite seus esboços com versículos bíblicos integrados e controle de tempo.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 mt-3 border-t border-[var(--border)]/60 flex items-center justify-between">
                      {latestOutline ? (
                        <Link
                          href={`/discursos/${latestOutline.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--primary)] text-white text-xs font-semibold hover:opacity-95 transition-opacity"
                        >
                          <span>Continuar esboço</span>
                          <ArrowRight size={13} />
                        </Link>
                      ) : (
                        <Link
                          href="/discursos"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--primary)] text-white text-xs font-semibold hover:opacity-95 transition-opacity"
                        >
                          <span>Novo esboço</span>
                          <ArrowRight size={13} />
                        </Link>
                      )}

                      <Link
                        href="/discursos"
                        className="text-xs font-medium text-[var(--ink-muted)] hover:text-[var(--primary)] transition-colors"
                      >
                        Ver todos
                      </Link>
                    </div>
                  </div>
                )}

                {/* 2. PASTOREIO & GRUPOS: Cuidado do Rebanho (se canUseShepherding || canViewMembers) */}
                {(perms.canUseShepherding || perms.canViewMembers) && (
                  <div className="rounded-[24px] bg-[var(--panel)] p-5 flex flex-col justify-between border border-[var(--border)]/60 hover:border-[var(--primary)]/40 transition-colors">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center shrink-0">
                            <ShieldCheck size={16} />
                          </div>
                          <span className="text-xs font-semibold text-[var(--ink)] uppercase tracking-wider">
                            Pastoreio & Grupos
                          </span>
                        </div>
                        {myGroupInfo && (
                          <span className="text-[11px] font-medium text-[var(--ink)] bg-[var(--surface)] px-2.5 py-0.5 rounded-full border border-[var(--border)]/60">
                            Grupo {myGroupInfo.sort_order}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col gap-1.5 mt-2">
                        {perms.canUseShepherding ? (
                          <>
                            <div className="flex items-baseline gap-1.5">
                              <span className="font-display font-semibold text-2xl text-[var(--ink)]">
                                {pastoralData?.dueCount ?? 0}
                              </span>
                              <span className="text-xs text-[var(--ink-muted)] font-medium">
                                {(pastoralData?.dueCount ?? 0) === 1
                                  ? "irmão na hora de visitar"
                                  : "irmãos na hora de visitar"}
                              </span>
                            </div>

                            {pastoralData?.latestVisit ? (
                              <p className="text-xs text-[var(--ink-muted)] line-clamp-2">
                                Última visita:{" "}
                                <strong className="text-[var(--ink)] font-medium">
                                  {pastoralData.latestVisit.family_or_person}
                                </strong>{" "}
                                ({formatRelativeDate(pastoralData.latestVisit.visit_date)})
                              </p>
                            ) : (
                              <p className="text-xs text-[var(--ink-muted)]">
                                Mantenha o acompanhamento confidencial do rebanho em dia.
                              </p>
                            )}
                          </>
                        ) : myGroupInfo ? (
                          <>
                            <h4 className="font-display font-semibold text-base text-[var(--ink)]">
                              {myGroupInfo.sort_order}. {myGroupInfo.name}
                            </h4>
                            <p className="text-xs text-[var(--ink-muted)]">
                              {myGroupInfo.meeting_info || "Grupo de serviço de campo da congregação."}
                            </p>
                          </>
                        ) : null}
                      </div>
                    </div>

                    <div className="pt-4 mt-3 border-t border-[var(--border)]/60 flex items-center justify-between">
                      {perms.canUseShepherding ? (
                        <Link
                          href="/pastoreio"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--primary)] text-white text-xs font-semibold hover:opacity-95 transition-opacity"
                        >
                          <span>Registrar visita</span>
                          <ArrowRight size={13} />
                        </Link>
                      ) : (
                        <Link
                          href="/irmaos"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--primary)] text-white text-xs font-semibold hover:opacity-95 transition-opacity"
                        >
                          <span>Ver grupos</span>
                          <ArrowRight size={13} />
                        </Link>
                      )}

                      {perms.canViewMembers && (
                        <Link
                          href="/irmaos"
                          className="text-xs font-medium text-[var(--ink-muted)] hover:text-[var(--primary)] transition-colors"
                        >
                          Irmãos
                        </Link>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. INTERESSADOS & ESTUDOS (se canUseContacts) */}
                {perms.canUseContacts && (
                  <div className="rounded-[24px] bg-[var(--panel)] p-5 flex flex-col justify-between border border-[var(--border)]/60 hover:border-[var(--primary)]/40 transition-colors">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[var(--success)]/15 text-[var(--success)] flex items-center justify-center shrink-0">
                            <Users size={16} />
                          </div>
                          <span className="text-xs font-semibold text-[var(--ink)] uppercase tracking-wider">
                            Estudos & Revisitas
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-[var(--success)] bg-[var(--success)]/10 px-2.5 py-0.5 rounded-full">
                          {estudosAtivos} {estudosAtivos === 1 ? "ativo" : "ativos"}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1 mt-2">
                        <div className="flex items-baseline gap-2">
                          <span className="font-display font-semibold text-2xl text-[var(--ink)]">
                            {estudosAtivos + revisitas}
                          </span>
                          <span className="text-xs text-[var(--ink-muted)] font-medium">
                            pessoas em acompanhamento
                          </span>
                        </div>
                        <p className="text-xs text-[var(--ink-muted)] mt-1">
                          {revisitas} {revisitas === 1 ? "revisita" : "revisitas"} e {estudosAtivos}{" "}
                          {estudosAtivos === 1 ? "estudo bíblico" : "estudos bíblicos"}. Prepare suas anotações antes de sair.
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 mt-3 border-t border-[var(--border)]/60 flex items-center justify-between">
                      <Link
                        href="/contatos"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--primary)] text-white text-xs font-semibold hover:opacity-95 transition-opacity"
                      >
                        <span>Abrir interessados</span>
                        <ArrowRight size={13} />
                      </Link>

                      {profile.meeting_link && (
                        <button
                          type="button"
                          onClick={handleShareLetterInvite}
                          className="text-xs font-medium text-[var(--ink-muted)] hover:text-[var(--primary)] transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Share2 size={12} />
                          <span>Cartas</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Registro de Horas como Coadjuvante Discreto no Desktop (se canUseHours) */}
              {perms.canUseHours && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-3.5 rounded-2xl bg-[var(--panel)]/70 dark:bg-white/[0.04] border border-[var(--border)]/60">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
                      <Clock size={16} />
                    </div>
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wider">
                        Ministério neste mês:
                      </span>
                      <span className="font-display font-semibold text-base sm:text-lg text-[var(--ink)]">
                        {hoursDoneFormatted}
                      </span>
                      <span className="text-xs text-[var(--ink-muted)]">
                        de {profile.monthly_goal_hours}h
                      </span>
                      <span className="text-xs text-[var(--ink-muted)] font-medium hidden sm:inline">
                        • Faltam {formatHours(goalCalc.hoursRemaining)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => setDesktopManualOpen(true)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full",
                        "bg-[var(--surface)] text-[var(--ink)] text-xs font-semibold",
                        "hover:bg-black/5 dark:hover:bg-white/10 border border-[var(--border)]",
                        "shadow-xs transition-colors cursor-pointer"
                      )}
                      aria-label="Lançar horas manualmente"
                    >
                      <Plus size={13} className="text-[var(--primary)]" />
                      <span>Lançar horas manualmente</span>
                    </button>

                    <Link
                      href="/historico"
                      className="text-xs font-medium text-[var(--primary)] hover:underline underline-offset-4 hidden md:inline"
                    >
                      Ver detalhes →
                    </Link>
                  </div>
                </div>
              )}
            </div>
        </section>
      </Reveal>

      {/* ─────────────────────────────────────────────────────────────
          ATO 2 — Frase de Destaque Gigante em Serifa (Scroll Statement)
      ───────────────────────────────────────────────────────────── */}
      <Reveal delayMs={60}>
        <section
          className="max-w-4xl mx-auto py-12 lg:py-20 text-center px-4"
          aria-label="Resumo dinâmico do ministério"
        >
          <p
            className="font-display font-normal text-[var(--ink)] tracking-[-0.03em] leading-[1.25]"
            style={{ fontSize: "clamp(1.85rem, 4.5vw, 3.25rem)" }}
          >
            {renderStatement()}
          </p>
        </section>
      </Reveal>

      {/* ─────────────────────────────────────────────────────────────
          ATO 3 — Blocos Editoriais Assimétricos
          (Cartão Visual 40px à Esquerda + Tipografia Pura à Direita, SEM Caixa!)
      ───────────────────────────────────────────────────────────── */}

      {/* Bloco 1 — Meta do Mês & Ritmo (SOMENTE se canUseHours) */}
      {perms.canUseHours && (
        <Reveal delayMs={100}>
          <section
            className="max-w-5xl mx-auto py-8 lg:py-14 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center"
            aria-label="Meta do mês e ritmo ideal"
          >
            {/* Esquerda: Cartão Visual 40px em --panel */}
            <MonthlyGoalCard
              userId={userId}
              onRecordSaved={refresh}
              completedMinutes={totalMinutes}
              goalHours={profile.monthly_goal_hours}
              workingDays={profile.working_days ?? [1, 2, 3, 4, 5, 6, 7]}
              weeklySchedule={profile.weekly_schedule}
              className="lg:col-span-6"
            />

            {/* Direita: APENAS TIPOGRAFIA PURA SOLTA NO FUNDO BRANCO */}
            <div className="lg:col-span-6 flex flex-col justify-center">
              <h2 className="text-2xl lg:text-3xl font-medium tracking-[-0.02em] font-sans text-[var(--ink)] leading-snug">
                {goalCalc.hoursRemaining > 0
                  ? `Faltam ${formatHours(goalCalc.hoursRemaining)} para concluir sua meta de ${currentMonthName}.`
                  : `Meta de ${currentMonthName} concluída!`}
              </h2>

              <p className="text-[var(--ink-muted)] text-base leading-relaxed mt-3">
                Considerando seus {goalCalc.scheduledDaysRemaining} dias programados restantes,
                seu ritmo ideal é de{" "}
                <strong className="text-[var(--ink)] font-semibold">
                  {formatHours(goalCalc.idealHoursPerScheduledDay)}
                </strong>{" "}
                por dia programado.{" "}
                <span
                  className={cn(
                    "font-medium",
                    goalCalc.paceStatus === "ahead"
                      ? "text-[var(--success)]"
                      : goalCalc.paceStatus === "on_pace"
                      ? "text-[var(--primary)]"
                      : "text-[var(--alert)]"
                  )}
                >
                  {goalCalc.paceStatus === "ahead"
                    ? "Seu ritmo está adiantado em relação ao esperado para hoje."
                    : goalCalc.paceStatus === "on_pace"
                    ? "Seu ritmo está em dia com a sua programação."
                    : "Abaixo da média programada para este período."}
                </span>
              </p>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-6">
                <Link
                  href="/historico"
                  className="font-semibold text-sm inline-flex items-center gap-1.5 text-[var(--primary)] underline-offset-4 hover:underline"
                >
                  Ver histórico e ano de serviço →
                </Link>
                <Link
                  href="/relatorio"
                  className="font-semibold text-sm inline-flex items-center gap-1.5 text-[var(--primary)] underline-offset-4 hover:underline"
                >
                  Enviar relatório do mês →
                </Link>
              </div>
            </div>
          </section>
        </Reveal>
      )}

      {/* Bloco 2 — Interessados, Estudos & Agenda (se canUseContacts) */}
      {perms.canUseContacts && (
        <Reveal delayMs={140}>
          <section
            className="max-w-5xl mx-auto py-8 lg:py-14 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center"
            aria-label="Agenda e interessados"
          >
            {/* Esquerda: Cartão Visual 40px em --panel */}
            <AgendaCalendar
              userId={userId}
              profile={profile}
              className="lg:col-span-6"
            />

            {/* Direita: APENAS TIPOGRAFIA PURA SOLTA NO FUNDO BRANCO */}
            <div className="lg:col-span-6 flex flex-col justify-center">
              <h2 className="text-2xl lg:text-3xl font-medium tracking-[-0.02em] font-sans text-[var(--ink)] leading-snug">
                Revisitas, estudos bíblicos e sua agenda da semana.
              </h2>

              <p className="text-[var(--ink-muted)] text-base leading-relaxed mt-3">
                Você acompanha{" "}
                <strong className="text-[var(--ink)] font-semibold">
                  {estudosAtivos} {estudosAtivos === 1 ? "estudo ativo" : "estudos ativos"}
                </strong>{" "}
                e{" "}
                <strong className="text-[var(--ink)] font-semibold">
                  {revisitas} {revisitas === 1 ? "revisita" : "revisitas"}
                </strong>{" "}
                cadastradas. Mantenha seus apontamentos em dia antes de cada visita para um
                ensino progressivo.
              </p>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-6">
                <Link
                  href="/contatos"
                  className="font-semibold text-sm inline-flex items-center gap-1.5 text-[var(--primary)] underline-offset-4 hover:underline"
                >
                  Abrir todos os interessados →
                </Link>

                {profile.meeting_link && (
                  <button
                    type="button"
                    onClick={handleShareLetterInvite}
                    className="font-semibold text-sm inline-flex items-center gap-1.5 text-[var(--primary)] underline-offset-4 hover:underline cursor-pointer"
                  >
                    <Share2 size={14} />
                    Vamos escrever cartas juntos? →
                  </button>
                )}
              </div>
            </div>
          </section>
        </Reveal>
      )}

      {/* Bloco 3 — Cuidado Pastoral & Grupos da Congregação (se canUseShepherding || canViewMembers) */}
      {(perms.canUseShepherding || perms.canViewMembers) && (
        <Reveal delayMs={180}>
          <section
            className="max-w-5xl mx-auto py-8 lg:py-14 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center"
            aria-label="Cuidado pastoral e grupos de serviço"
          >
            {/* Esquerda: Cartão Visual 40px azul-marinho com textura radial e círculos de pessoas */}
            <div className="lg:col-span-6">
              <PastoralVisualCard
                dueCount={pastoralData?.dueCount ?? 0}
                dueMembers={pastoralData?.dueMembers}
                groupName={myGroupInfo?.name}
              />
            </div>

            {/* Direita: APENAS TIPOGRAFIA PURA SOLTA NO FUNDO BRANCO */}
            <div className="lg:col-span-6 flex flex-col justify-center">
              <h2 className="text-2xl lg:text-3xl font-medium tracking-[-0.02em] font-sans text-[var(--ink)] leading-snug">
                Cuidado pastoral e grupos de serviço.
              </h2>

              <p className="text-[var(--ink-muted)] text-base leading-relaxed mt-3">
                {perms.canUseShepherding ? (
                  <>
                    <strong className="text-[var(--ink)] font-semibold">
                      {pastoralData?.dueCount ?? 0}{" "}
                      {pastoralData?.dueCount === 1 ? "irmão está" : "irmãos estão"}
                    </strong>{" "}
                    no momento oportuno para visita de pastoreio.
                    {pastoralData?.latestVisit && (
                      <>
                        {" "}Última visita registrada para{" "}
                        <strong className="text-[var(--ink)] font-medium">
                          {pastoralData.latestVisit.family_or_person}
                        </strong>{" "}
                        em {formatRelativeDate(pastoralData.latestVisit.visit_date)}
                        {pastoralData.latestVisit.created_by_name
                          ? ` por ${pastoralData.latestVisit.created_by_name}`
                          : ""}
                        .
                      </>
                    )}
                  </>
                ) : null}

                {myGroupInfo && (
                  <>
                    {" "}Seu grupo:{" "}
                    <strong className="text-[var(--ink)] font-semibold">
                      {myGroupInfo.sort_order}. {myGroupInfo.name}
                    </strong>
                    {myGroupInfo.overseer_name && ` • Superintendente: ${myGroupInfo.overseer_name}`}
                    {myGroupInfo.assistant_name && ` • Ajudante: ${myGroupInfo.assistant_name}`}
                    {myGroupInfo.meeting_info && ` • Saída: ${myGroupInfo.meeting_info}`}
                    .
                  </>
                )}
              </p>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-6">
                {perms.canUseShepherding && (
                  <Link
                    href="/pastoreio"
                    className="font-semibold text-sm inline-flex items-center gap-1.5 text-[var(--primary)] underline-offset-4 hover:underline"
                  >
                    Abrir Registro de Pastoreio →
                  </Link>
                )}

                {perms.canViewMembers && (
                  <Link
                    href="/irmaos"
                    className="font-semibold text-sm inline-flex items-center gap-1.5 text-[var(--primary)] underline-offset-4 hover:underline"
                  >
                    Ver Grupos de Serviço e Irmãos →
                  </Link>
                )}
              </div>
            </div>
          </section>
        </Reveal>
      )}

      {/* ─────────────────────────────────────────────────────────────
          ATO 4 — Rodapé Editorial Monumental
      ───────────────────────────────────────────────────────────── */}
      <Reveal delayMs={200}>
        <footer className="mt-16 pt-16 border-t border-[var(--border)] flex flex-col items-center text-center">
          {/* 1. Lista vertical centralizada de links grandes em serifa (font-display) */}
          <nav
            className="flex flex-col items-center justify-center space-y-3 pb-8"
            aria-label="Links do rodapé"
          >
            {footerNavLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-display font-medium text-2xl lg:text-4xl text-[var(--ink)] hover:text-[var(--primary)] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* 2. Palavra-marca Gigante de Ponta a Ponta */}
          <div className="w-full text-center my-8 lg:my-14 overflow-hidden select-none">
            <span
              className="font-display font-normal text-[var(--ink)] block tracking-[-0.045em] leading-[0.92]"
              style={{ fontSize: "clamp(4.5rem, 18vw, 11.5rem)" }}
              aria-hidden="true"
            >
              Kairós
            </span>
          </div>

          {/* 3. Linha de assinatura em 3 colunas abaixo do nome gigante */}
          <div className="w-full text-xs text-[var(--ink-muted)] pt-6 pb-12 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Esquerda: Chama + Descrição */}
            <div className="flex items-center gap-2">
              <Image
                src="/kairos-mark-transparent.svg"
                alt=""
                width={16}
                height={16}
                className="w-4 h-4 object-contain"
              />
              <span>Hub da Congregação & Ministério Pessoal</span>
            </div>

            {/* Centro: Tagline editorial */}
            <div className="text-center">
              <span>Tempo oportuno para o que mais importa</span>
            </div>

            {/* Direita: Sync + Tema */}
            <div className="flex items-center gap-3">
              <SyncStatusIndicator />
              <ThemeToggle variant="icon" />
            </div>
          </div>
        </footer>
      </Reveal>

      {/* Drawer para lançamento manual de horas no Desktop */}
      <Drawer
        open={desktopManualOpen}
        onClose={() => setDesktopManualOpen(false)}
        title="Lançar horas manualmente"
        description="Registre as horas de pregação realizadas no ministério"
      >
        <ManualEntryForm
          userId={userId}
          onSaved={() => {
            setDesktopManualOpen(false);
            refresh();
          }}
        />
      </Drawer>

      <ReleaseNotesModal />
    </div>
  );
}
