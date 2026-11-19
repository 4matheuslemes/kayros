"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { X, Loader2, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEditorContext } from "./editor-context";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface VerseContent {
  verse: number;
  text: string;
}

interface VerseResult {
  key: string;
  items: VerseContent[];
}

interface BodyDraft {
  blockId: string;
  /** Corpo do bloco no momento da digitação (detecta mudança externa/undo) */
  base: string;
  value: string;
}

interface VersePanelProps {
  editable?: boolean;
  fontSize?: number;
}

const SAVE_DEBOUNCE_MS = 400;

export function VersePanel({ editable = false, fontSize }: VersePanelProps) {
  const { isPanelOpen, closePanel, activeItem, updateBlockBody } =
    useEditorContext();
  const supabase = useMemo(() => createClient(), []);

  const blockItem = activeItem?.kind === "block" ? activeItem : null;
  const verseItem = activeItem?.kind === "verse" ? activeItem : null;
  const activeBlockId = blockItem?.blockId ?? null;

  // Altura do bottom sheet (< 1024px): 52dvh ↔ 80dvh. Recolhe ao fechar o painel.
  const [isExpanded, setIsExpanded] = useState(false);
  const [prevOpen, setPrevOpen] = useState(isPanelOpen);
  if (prevOpen !== isPanelOpen) {
    setPrevOpen(isPanelOpen);
    if (!isPanelOpen) setIsExpanded(false);
  }

  // ── Edição do corpo do bloco: rascunho local + debounce ──
  const [draft, setDraft] = useState<BodyDraft | null>(null);
  const pendingRef = useRef<{ blockId: string; body: string } | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // O rascunho evita saltos de cursor; cai para o corpo do nó se ficou obsoleto
  const bodyValue =
    blockItem &&
      draft &&
      draft.blockId === blockItem.blockId &&
      draft.base === blockItem.body
      ? draft.value
      : (blockItem?.body ?? "");

  /*
   * Grava imediatamente a edição pendente (se houver) no bloco ao qual ela
   * pertence. Idempotente: sem alteração pendente, não faz nada.
   */
  const flushPendingSave = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    const pending = pendingRef.current;
    if (pending) {
      pendingRef.current = null;
      updateBlockBody(pending.blockId, pending.body);
    }
  }, [updateBlockBody]);

  // Ao trocar de bloco (ou desmontar), salva o que ficou pendente do anterior
  useEffect(() => {
    return () => flushPendingSave();
  }, [activeBlockId, flushPendingSave]);

  // Qualquer fechamento do painel (X, Esc, toggle no chip) salva antes
  useEffect(() => {
    if (!isPanelOpen) flushPendingSave();
  }, [isPanelOpen, flushPendingSave]);

  const handleBodyChange = (value: string) => {
    if (!blockItem) return;
    setDraft({ blockId: blockItem.blockId, base: blockItem.body, value });
    pendingRef.current = { blockId: blockItem.blockId, body: value };

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(flushPendingSave, SAVE_DEBOUNCE_MS);
  };

  const handleClose = useCallback(() => {
    flushPendingSave();
    closePanel();
  }, [flushPendingSave, closePanel]);

  /*
   * Foco automático na textarea apenas com ponteiro preciso (mouse/trackpad).
   * Em touch/tablet o teclado virtual só abre quando o usuário toca na textarea.
   */
  useEffect(() => {
    if (!isPanelOpen || !activeBlockId || !editable) return;
    if (
      typeof window === "undefined" ||
      !window.matchMedia("(pointer: fine)").matches
    ) {
      return;
    }
    const timer = setTimeout(() => {
      textareaRef.current?.focus({ preventScroll: true });
    }, 50);
    return () => clearTimeout(timer);
  }, [isPanelOpen, activeBlockId, editable]);

  // ── Versículo: busca no Supabase assim que o item ativo muda ──
  const vBook = verseItem?.book;
  const vChapter = verseItem?.chapter;
  const vVerse = verseItem?.verse;
  const vVerseEnd = verseItem?.verseEnd ?? null;
  const verseKey =
    vBook != null && vChapter != null && vVerse != null
      ? `${vBook}:${vChapter}:${vVerse}:${vVerseEnd ?? ""}`
      : null;

  const [verseResult, setVerseResult] = useState<VerseResult | null>(null);
  const loading = verseKey !== null && verseResult?.key !== verseKey;
  const verseContent =
    verseKey !== null && verseResult?.key === verseKey ? verseResult.items : [];

  useEffect(() => {
    if (verseKey === null || vBook == null || vChapter == null || vVerse == null) {
      return;
    }

    let cancelled = false;

    async function fetchVerses() {
      const { data, error } = await supabase
        .from("bible_verses")
        .select("verse, text")
        .eq("book_number", vBook)
        .eq("chapter", vChapter)
        .gte("verse", vVerse)
        .lte("verse", vVerseEnd ?? vVerse)
        .order("verse", { ascending: true });

      if (cancelled) return;

      if (error) {
        console.error("Erro ao carregar versículos:", error);
        setVerseResult({ key: verseKey as string, items: [] });
      } else {
        setVerseResult({ key: verseKey as string, items: data ?? [] });
      }
    }

    fetchVerses();

    return () => {
      cancelled = true;
    };
  }, [verseKey, vBook, vChapter, vVerse, vVerseEnd, supabase]);

  // Fechar com tecla Escape
  useEffect(() => {
    if (!isPanelOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isPanelOpen, handleClose]);

  /*
   * Painel adaptativo (CSS em globals.css), sem Portal e sem backdrop:
   *  - < 1024px: bottom sheet fixo (52dvh, ou 80dvh quando expandido)
   *  - >= 1024px: painel lateral proporcional
   * Permanece no fluxo do DOM para preservar o :has() do layout, a toolbar
   * sticky do editor e o clique direto de um chip para outro.
   */
  return (
    <div
      className={cn(
        "verse-panel-column",
        isPanelOpen && "verse-panel-column--open",
        isPanelOpen && isExpanded && "verse-panel-column--expanded"
      )}
      aria-hidden={!isPanelOpen}
    >
      <div
        role="complementary"
        aria-label={
          blockItem ? "Painel de conteúdo do bloco" : "Painel de versículo"
        }
        className="verse-panel-inner"
      >
        {/* HEADER */}
        <div className="verse-panel-header">
          <div className="min-w-0 pr-2">
            {blockItem ? (
              <>
                <h2 className="font-display font-semibold text-base text-[var(--primary)] leading-tight truncate">
                  {blockItem.label}
                </h2>
                <p className="text-2xs text-[var(--ink-muted)] uppercase tracking-wider mt-0.5">
                  {blockItem.optional
                    ? "Bloco opcional • Se houver tempo"
                    : "Bloco no painel"}
                </p>
              </>
            ) : (
              <>
                <h2 className="font-display font-semibold text-base text-[var(--primary)] leading-tight">
                  {verseItem?.text ?? ""}
                </h2>
                <p className="text-2xs text-[var(--ink-muted)] uppercase tracking-wider mt-0.5">
                  Tradução do Novo Mundo
                </p>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Expandir/recolher a altura do bottom sheet (apenas < 1024px) */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded((v) => !v)}
              className="lg:hidden h-8 w-8 shrink-0 text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--background)] rounded-full"
              aria-label={isExpanded ? "Recolher painel" : "Expandir painel"}
              aria-expanded={isExpanded}
              title={isExpanded ? "Recolher painel" : "Expandir painel"}
              tabIndex={isPanelOpen ? 0 : -1}
            >
              {isExpanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8 shrink-0 text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--background)] rounded-full"
              aria-label="Fechar painel"
              tabIndex={isPanelOpen ? 0 : -1}
            >
              <X size={18} />
            </Button>
          </div>
        </div>

        {/* CONTEÚDO — scrollável independentemente */}
        <div className="verse-panel-body">
          {blockItem ? (
            editable ? (
              <div className="flex flex-col h-full lg:min-h-[360px]">
                <textarea
                  ref={textareaRef}
                  value={bodyValue}
                  onChange={(e) => handleBodyChange(e.target.value)}
                  onBlur={flushPendingSave}
                  placeholder="Escreva aqui o conteúdo deste bloco..."
                  className={cn(
                    "w-full flex-1 resize-none bg-transparent border-0 p-0 font-sans text-sm sm:text-base text-[var(--ink)] placeholder:text-[var(--ink-muted)]/50 focus:outline-none focus:ring-0 leading-relaxed lg:min-h-[300px]",
                    isExpanded ? "min-h-[50dvh]" : "min-h-[28dvh]"
                  )}
                />
              </div>
            ) : (
              <div
                className="whitespace-pre-wrap font-sans text-[var(--ink)] leading-relaxed"
                style={{ fontSize: fontSize ? `${fontSize}px` : "1rem" }}
              >
                {blockItem.body.trim().length > 0 ? (
                  blockItem.body
                ) : (
                  <span className="italic text-[var(--ink-muted)] text-sm">
                    Este bloco não possui conteúdo registrado.
                  </span>
                )}
              </div>
            )
          ) : loading ? (
            <div className="flex items-center justify-center py-12 text-[var(--ink-muted)]">
              <Loader2 className="animate-spin w-6 h-6" />
            </div>
          ) : verseContent.length === 0 ? (
            <p className="text-body font-sans text-[var(--ink-muted)]">
              Não foi possível carregar o texto deste versículo.
            </p>
          ) : (
            <div className="flex flex-col gap-5">
              {verseContent.map((verse) => (
                <p
                  key={verse.verse}
                  className="font-sans text-[var(--ink)] leading-[1.9]"
                  style={{ fontSize: fontSize ? `${fontSize}px` : "1rem" }}
                >
                  <sup className="font-semibold text-[var(--accent)] mr-1.5 text-xs">
                    {verse.verse}
                  </sup>
                  {verse.text}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
