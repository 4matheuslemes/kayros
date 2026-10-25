"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Home,
  UsersRound,
  HeartHandshake,
  ArrowRight,
} from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { useUserPermissions } from "@/contexts/user-permissions-context";
import { Card } from "@/components/ui/card";


interface CongregacaoClientProps {
  counts: {
    publicadores: number;
    grupos: number;
    pastoreio: number;
  };
}

export function CongregacaoClient({ counts }: CongregacaoClientProps) {
  const router = useRouter();
  const perms = useUserPermissions();

  // No desktop, ao entrar em /congregacao, redireciona suavemente para a primeira visão
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      if (perms.canViewMembers) {
        router.replace("/irmaos?view=grupos");
      } else if (perms.canUseShepherding) {
        router.replace("/pastoreio");
      }
    }
  }, [perms.canViewMembers, perms.canUseShepherding, router]);

  const items = [
    {
      id: "grupos",
      href: "/irmaos?view=grupos",
      title: "Grupos de Serviço de Campo",
      description: "Superintendentes, ajudantes e alocação de publicadores nos grupos",
      icon: Home,
      countBadge: `${counts.grupos} ${counts.grupos === 1 ? "grupo" : "grupos"}`,
      allowed: perms.canViewMembers,
    },
    {
      id: "publicadores",
      href: "/irmaos?view=publicadores",
      title: "Todos os publicadores",
      description: "Lista geral da congregação, pioneiros, designações e contatos",
      icon: UsersRound,
      countBadge: `${counts.publicadores} ${counts.publicadores === 1 ? "publicador" : "publicadores"}`,
      allowed: perms.canViewMembers,
    },
    {
      id: "pastoreio",
      href: "/pastoreio",
      title: "Registro de Pastoreio",
      description: "Visitas pastorais confidenciais, acompanhamentos e histórico",
      icon: HeartHandshake,
      countBadge: `${counts.pastoreio} ${counts.pastoreio === 1 ? "visita" : "visitas"}`,
      allowed: perms.canUseShepherding,
    },
  ].filter((item) => item.allowed);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28 lg:pb-12">
      <AppHeader
        title="Congregação"
        subtitle="Módulos operacionais e organizacionais da congregação"
        backHref="/"
      />

      {/* ── MOBILE: MENU ÍNDICE EDITORIAL ESTILO HOURGLASS (< 1024px) ── */}

      <div className="lg:hidden flex flex-col divide-y divide-[var(--border)] border-y border-[var(--border)] bg-[var(--surface)]/40 rounded-2xl overflow-hidden shadow-2xs">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href}
              prefetch={true}
              className="flex items-center justify-between gap-4 py-4.5 px-4 sm:px-5 hover:bg-[var(--surface)] active:bg-[var(--background)] transition-all group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0 group-hover:bg-[var(--primary)] group-hover:text-white transition-colors">
                  <Icon size={20} strokeWidth={2} />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-sans font-medium text-base sm:text-lg text-[var(--ink)] group-hover:text-[var(--primary)] transition-colors">
                      {item.title}
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--background)] text-[var(--ink-muted)] border border-[var(--border)]/70">
                      {item.countBadge}
                    </span>
                  </div>
                  <span className="text-xs text-[var(--ink-muted)] line-clamp-1 mt-0.5">
                    {item.description}
                  </span>
                </div>
              </div>

              <ChevronRight
                size={20}
                className="text-[var(--ink-muted)] shrink-0 group-hover:text-[var(--primary)] group-hover:translate-x-0.5 transition-all"
              />
            </Link>
          );
        })}
      </div>

      {/* ── DESKTOP: CARTÕES VISUAIS AMPLOS (>= 1024px) ── */}
      <div className="hidden lg:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Card
              key={item.id}
              className="p-6 rounded-[28px] bg-[var(--panel)] border border-[var(--border)]/60 shadow-xs flex flex-col justify-between gap-5 hover:shadow-md transition-all group"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center group-hover:bg-[var(--primary)] group-hover:text-white transition-colors">
                    <Icon size={24} strokeWidth={2} />
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--background)] text-[var(--ink-muted)] border border-[var(--border)]">
                    {item.countBadge}
                  </span>
                </div>
                <div>
                  <h3 className="font-display font-medium text-xl text-[var(--ink)] group-hover:text-[var(--primary)] transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm text-[var(--ink-muted)] mt-1.5 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>

              <Link
                href={item.href}
                prefetch={true}
                className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--primary)] group-hover:text-[var(--primary-dark)] mt-2 pt-3 border-t border-[var(--border)]/50"
              >
                <span>Acessar módulo</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
