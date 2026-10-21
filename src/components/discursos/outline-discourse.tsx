"use client";

import { useEffect, useMemo, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import {
  ArrowLeft,
  Maximize,
  Minimize,
  Minus,
  Plus,
  LayoutList,
  Layers,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { BibleVerse } from "./bible-verse-node";
import { VersePanel } from "./verse-panel";
import { DiscourseTimer } from "./discourse-timer";
import { CardMode } from "./discourse-card-mode";
import { BackstageMark } from "./backstage-mark";
import { EditorProvider } from "./editor-context";
import { Button } from "@/components/ui/button";
import { estimateDuration, formatDuration, splitByHeadings } from "@/lib/discursos/outline-utils";
import type { JSONContent } from "@tiptap/core";

interface OutlineDiscourseProps {
  id: string;
  title: string;
  category?: string | null;
  content: JSONContent;
}

const FONT_SIZES = [16, 20, 24, 32] as const;
type FontSizeIndex = 0 | 1 | 2 | 3;

export function OutlineDiscourse({
  id: _id,
  title,
  category,
  content,
}: OutlineDiscourseProps) {
  const router = useRouter();

  const [fontIndex, setFontIndex] = useState<FontSizeIndex>(1); // 20px default
  const fontSize = FONT_SIZES[fontIndex];
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<"scroll" | "cards">("scroll");

  // Estimativa de duração
  const { minutes: estimatedMinutes } = useMemo(
    () => estimateDuration(content),
    [content]
  );

  // Seções para Modo Cartões (divididas por H1/H2)
  const sections = useMemo(() => splitByHeadings(content), [content]);

  // Editor somente para leitura no Modo Rolagem
  const editor = useEditor({
    editable: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Placeholder.configure({ placeholder: "" }),
      BibleVerse,
      BackstageMark,
    ],
    content: content || { type: "doc", content: [] },
    editorProps: {
      attributes: {
        class: "discourse-editor focus:outline-none w-full min-w-0",
      },
    },
  });

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Screen Wake Lock: mantém a tela acesa durante a apresentação
  // Falha em silêncio se não suportado; readquire automaticamente ao voltar a ficar visível
  useEffect(() => {
    if (typeof window === "undefined" || !("wakeLock" in navigator)) return;

    let wakeLock: WakeLockSentinel | null = null;
    let isMounted = true;

    const requestWakeLock = async () => {
      try {
        if (document.visibilityState === "visible" && isMounted) {
          wakeLock = await navigator.wakeLock.request("screen");
        }
      } catch {
        // Falha em silêncio se não houver suporte ou permissão
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        requestWakeLock();
      }
    };

    requestWakeLock();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (wakeLock) {
        wakeLock.release().catch(() => {});
        wakeLock = null;
      }
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error("Erro ao alternar tela cheia:", error);
    }
  };

  const increaseFontSize = () => {
    setFontIndex((cur) => (cur < FONT_SIZES.length - 1 ? ((cur + 1) as FontSizeIndex) : cur));
  };

  const decreaseFontSize = () => {
    setFontIndex((cur) => (cur > 0 ? ((cur - 1) as FontSizeIndex) : cur));
  };

  if (!editor) return null;

  return (
    <EditorProvider>
      <div className={`discourse-page w-full h-[100dvh] flex flex-col overflow-hidden bg-[var(--background)] text-[var(--ink)] pb-0${isFullscreen ? " discourse-fullscreen" : ""}`}>
        {/* ── CABEÇALHO LIMPO (SEM BARRA DE EDIÇÃO) ── */}
        <header className="discourse-header z-30 shrink-0 w-full flex items-center justify-between gap-3 px-3 py-2 sm:px-4 sm:py-2.5 bg-[var(--surface)]/95 border-b border-[var(--border)] backdrop-blur-md">
          {/* Esquerda: Voltar + Título + Estimativa */}
          <div className="discourse-header-left flex items-center gap-2 sm:gap-3 min-w-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              aria-label="Voltar para o editor"
              className="h-8 w-8 sm:h-9 sm:w-9 text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--background)] rounded-full shrink-0"
            >
              <ArrowLeft size={18} />
            </Button>

            <div className="discourse-header-title flex flex-col min-w-0">
              <span className="discourse-header-main-title text-sm sm:text-base font-semibold text-[var(--ink)] truncate max-w-[180px] sm:max-w-[320px] md:max-w-[450px]">
                {title || "Sem título"}
              </span>
              {category && (
                <span className="discourse-header-category text-[11px] text-[var(--ink-muted)] truncate">
                  {category}
                </span>
              )}
            </div>

            {/* Badge "~X min" no cabeçalho */}
            {estimatedMinutes > 0 && (
              <span className="discourse-duration-badge text-xs font-medium text-[var(--ink-muted)] px-2 py-0.5 border border-[var(--border)] rounded-full bg-[var(--surface)] whitespace-nowrap shrink-0 hidden xs:inline-flex">
                {formatDuration(estimatedMinutes)}
              </span>
            )}
          </div>

          {/* Direita: Timer + Modo (Rolagem / Cartões) + Seletor de Fonte + Tela Cheia */}
          <div className="discourse-header-actions flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Timer com estimativa pré-preenchida */}
            <DiscourseTimer estimatedMinutes={estimatedMinutes > 0 ? estimatedMinutes : undefined} />

            <div className="w-px h-5 bg-[var(--border)] mx-0.5 sm:mx-1" aria-hidden />

            {/* Toggle de Modo: Rolagem vs Cartões */}
            <div className="discourse-view-controls flex items-center p-0.5 border border-[var(--border)] rounded-lg bg-[var(--surface)]" title="Alternar modo de exibição">
              <button
                type="button"
                onClick={() => setViewMode("scroll")}
                aria-label="Modo Rolagem"
                aria-pressed={viewMode === "scroll"}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === "scroll"
                    ? "text-[var(--primary)] bg-[var(--background)] font-medium shadow-2xs"
                    : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
                }`}
              >
                <LayoutList size={15} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                aria-label="Modo Cartões"
                aria-pressed={viewMode === "cards"}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === "cards"
                    ? "text-[var(--primary)] bg-[var(--background)] font-medium shadow-2xs"
                    : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
                }`}
              >
                <Layers size={15} />
              </button>
            </div>

            <div className="w-px h-5 bg-[var(--border)] mx-0.5 sm:mx-1" aria-hidden />

            {/* Seletor de Fonte (16 / 20 / 24 / 32 px) */}
            <div className="discourse-font-controls flex items-center p-0.5 border border-[var(--border)] rounded-lg bg-[var(--surface)]" title={`Tamanho da fonte: ${fontSize}px`}>
              <button
                type="button"
                onClick={decreaseFontSize}
                disabled={fontIndex === 0}
                aria-label="Diminuir fonte"
                className="p-1 rounded-md text-[var(--ink-muted)] hover:text-[var(--ink)] disabled:opacity-30 cursor-pointer"
              >
                <Minus size={15} />
              </button>

              <span className="text-[11px] font-semibold text-[var(--ink)] min-w-[2.8rem] text-center tabular-nums">
                {fontSize}px
              </span>

              <button
                type="button"
                onClick={increaseFontSize}
                disabled={fontIndex === FONT_SIZES.length - 1}
                aria-label="Aumentar fonte"
                className="p-1 rounded-md text-[var(--ink-muted)] hover:text-[var(--ink)] disabled:opacity-30 cursor-pointer"
              >
                <Plus size={15} />
              </button>
            </div>

            {/* Tela Cheia */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
              className="h-8 w-8 text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--background)] rounded-full shrink-0"
            >
              {isFullscreen ? <Minimize size={17} /> : <Maximize size={17} />}
            </Button>
          </div>
        </header>

        {/* ── CONTEÚDO DO DISCURSO COM SPLIT VIEW ── */}
        <main className="discourse-layout flex-1 flex flex-row items-stretch w-full min-w-0 min-h-0 overflow-hidden">
          <section className="discourse-content flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
            {viewMode === "scroll" ? (
              /* Modo Rolagem */
              <div className="discourse-document max-w-[900px] w-full mx-auto px-4 py-8 sm:px-8 sm:py-10">
                <div className="discourse-heading mb-6 border-b border-[var(--border)] pb-4">
                  <h1 className="font-serif font-bold text-2xl sm:text-3xl text-[var(--primary)] leading-tight">
                    {title || "Sem título"}
                  </h1>
                  {category && (
                    <span className="text-xs sm:text-sm text-[var(--ink-muted)] font-serif italic mt-1 block">
                      {category}
                    </span>
                  )}
                </div>

                <div
                  className="discourse-body"
                  style={{ fontSize: `${fontSize}px` }}
                >
                  <EditorContent editor={editor} />
                </div>

                <div className="h-24" />
              </div>
            ) : (
              /* Modo Cartões */
              <CardMode
                sections={sections}
                fontSize={fontSize}
              />
            )}
          </section>

          {/* Painel de estudo de versículo em split view */}
          <VersePanel />
        </main>
      </div>
    </EditorProvider>
  );
}
