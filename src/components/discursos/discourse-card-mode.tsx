"use client";

import { useState, useCallback } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BibleVerse } from "./bible-verse-node";
import { BackstageMark } from "./backstage-mark";
import type { DocSection } from "@/lib/discursos/outline-utils";
import { cn } from "@/lib/utils";

interface CardSlideProps {
  section: DocSection;
  index: number;
  total: number;
  fontSize: number;
  onPrev: () => void;
  onNext: () => void;
}

/**
 * Um cartão individual da seção.
 * Cria um editor Tiptap read-only com o conteúdo dos nós desta seção.
 */
function CardSlide({ section, index, total, fontSize, onPrev, onNext }: CardSlideProps) {
  const editor = useEditor({
    editable: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      BibleVerse,
      BackstageMark,
    ],
    content: {
      type: "doc",
      content: section.nodes.length > 0 ? section.nodes : [{ type: "paragraph" }],
    },
    editorProps: {
      attributes: {
        class: "discourse-editor focus:outline-none w-full min-w-0",
      },
    },
  });

  return (
    <div className="discourse-card flex flex-col flex-1 max-w-[800px] w-full mx-auto px-4 md:px-6">
      {/* ── CABEÇALHO DO CARTÃO ─────────────────── */}
      {section.heading && (
        <div
          className={cn(
            "discourse-card-heading pb-3 mb-4 border-b-2 border-[var(--primary)]/20 font-serif font-semibold text-[var(--primary)] tracking-tight",
            section.level === 1 ? "text-2xl md:text-3xl" : "text-xl md:text-2xl"
          )}
        >
          {section.heading}
        </div>
      )}

      {/* ── CONTEÚDO DO CARTÃO ─────────────────── */}
      <div
        className="discourse-body discourse-card-body flex-1 overflow-y-auto pb-4"
        style={{ fontSize: `${fontSize}px` }}
      >
        {editor ? (
          <EditorContent editor={editor} />
        ) : (
          <div className="text-[var(--ink-muted)] text-sm">Carregando seção...</div>
        )}
      </div>

      {/* ── NAVEGAÇÃO ──────────────────────────── */}
      <div className="discourse-card-nav flex items-center justify-center gap-6 py-3 border-t border-[var(--border)] shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onPrev}
          disabled={index === 0}
          aria-label="Seção anterior"
          className="h-9 w-9 text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--background)] rounded-full disabled:opacity-30"
        >
          <ChevronLeft size={20} />
        </Button>

        <span className="discourse-card-counter text-xs font-semibold text-[var(--ink-muted)] min-w-[4rem] text-center tabular-nums">
          {index + 1} / {total}
        </span>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onNext}
          disabled={index === total - 1}
          aria-label="Próxima seção"
          className="h-9 w-9 text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--background)] rounded-full disabled:opacity-30"
        >
          <ChevronRight size={20} />
        </Button>
      </div>
    </div>
  );
}

interface CardModeProps {
  sections: DocSection[];
  fontSize: number;
}

/**
 * Modo Cartão — gerencia o cartão atualmente visível, com suporte a botões e swipe.
 */
export function CardMode({ sections, fontSize }: CardModeProps) {
  const [current, setCurrent] = useState(0);

  const goNext = useCallback(() => {
    setCurrent((i) => Math.min(i + 1, sections.length - 1));
  }, [sections.length]);

  const goPrev = useCallback(() => {
    setCurrent((i) => Math.max(i - 1, 0));
  }, []);

  const [swipeStartX, setSwipeStartX] = useState<number | null>(null);

  return (
    <div
      className="discourse-card-container flex-1 flex flex-col py-4 overflow-hidden"
      onTouchStart={(e) => setSwipeStartX(e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (swipeStartX === null) return;
        const delta = e.changedTouches[0].clientX - swipeStartX;
        if (delta < -50) goNext();
        else if (delta > 50) goPrev();
        setSwipeStartX(null);
      }}
    >
      <CardSlide
        key={current}
        section={sections[current] ?? { heading: null, level: null, nodes: [] }}
        index={current}
        total={sections.length}
        fontSize={fontSize}
        onPrev={goPrev}
        onNext={goNext}
      />
    </div>
  );
}
