"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEditorContext } from "./editor-context";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface VerseContent {
  verse: number;
  text: string;
}

interface VersePanelProps {
  editable?: boolean;
  fontSize?: number;
}

export function VersePanel({ editable = false, fontSize }: VersePanelProps) {
  const { isPanelOpen, closePanel, activeItem, updateBlockBody } =
    useEditorContext();
  const [verseContent, setVerseContent] = useState<VerseContent[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  // Estado local e debounce para edição do corpo do bloco
  const [localBody, setLocalBody] = useState("");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentBlockIdRef = useRef<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sincroniza o estado local quando o bloco ativo muda
  useEffect(() => {
    if (activeItem?.kind === "block") {
      if (currentBlockIdRef.current !== activeItem.blockId) {
        // Se tinha debounce pendente do bloco anterior, aplica imediatamente
        if (debounceTimerRef.current && currentBlockIdRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        currentBlockIdRef.current = activeItem.blockId;
        setLocalBody(activeItem.body || "");
      }
    } else {
      if (debounceTimerRef.current && currentBlockIdRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      currentBlockIdRef.current = null;
      setLocalBody("");
    }
  }, [activeItem]);

  // Foco automático na textarea quando um bloco é aberto em modo editável
  useEffect(() => {
    if (isPanelOpen && activeItem?.kind === "block" && editable) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus({ preventScroll: true });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isPanelOpen, activeItem?.kind, editable, activeItem && "blockId" in activeItem ? activeItem.blockId : null]);

  const handleBodyChange = useCallback(
    (newBody: string) => {
      setLocalBody(newBody);
      if (!activeItem || activeItem.kind !== "block") return;
      const blockId = activeItem.blockId;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        updateBlockBody(blockId, newBody);
        debounceTimerRef.current = null;
      }, 400);
    },
    [activeItem, updateBlockBody]
  );

  const handleBlur = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (activeItem && activeItem.kind === "block") {
      updateBlockBody(activeItem.blockId, localBody);
    }
  }, [activeItem, localBody, updateBlockBody]);

  // Limpeza de timer no unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  /*
   * Inicia o fetch assim que activeItem do tipo versículo muda —
   * antes mesmo da transição do painel concluir.
   */
  useEffect(() => {
    if (!activeItem || activeItem.kind !== "verse") {
      setVerseContent([]);
      return;
    }

    const verse = activeItem;

    async function fetchVerses() {
      setLoading(true);
      setVerseContent([]);

      const { data, error } = await supabase
        .from("bible_verses")
        .select("verse, text")
        .eq("book_number", verse.book)
        .eq("chapter", verse.chapter)
        .gte("verse", verse.verse)
        .lte("verse", verse.verseEnd ?? verse.verse)
        .order("verse", { ascending: true });

      if (error) {
        console.error("Erro ao carregar versículos:", error);
        setVerseContent([]);
      } else {
        setVerseContent(data ?? []);
      }

      setLoading(false);
    }

    fetchVerses();
  }, [activeItem, supabase]);

  // Fechar com tecla Escape
  useEffect(() => {
    if (!isPanelOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePanel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isPanelOpen, closePanel]);

  /*
   * Split view — painel no fluxo do layout, lado a lado com o editor.
   * Sem overlay, sem backdrop, sem position:fixed.
   * O painel usa sticky + height: 100dvh + scroll interno independente,
   * garantindo que abrir/fechar nunca mude o scroll do esboço.
   */
  return (
    <div
      className={cn(
        "verse-panel-column",
        isPanelOpen ? "verse-panel-column--open" : ""
      )}
      aria-hidden={!isPanelOpen}
    >
      <div
        role="complementary"
        aria-label={
          activeItem?.kind === "block"
            ? "Painel de conteúdo do bloco"
            : "Painel de versículo"
        }
        className="verse-panel-inner"
      >
        {/* HEADER */}
        <div className="verse-panel-header">
          <div className="min-w-0 pr-2">
            {activeItem?.kind === "block" ? (
              <>
                <h2 className="font-display font-semibold text-base text-[var(--primary)] leading-tight truncate">
                  {activeItem.label}
                </h2>
                <p className="text-2xs text-[var(--ink-muted)] uppercase tracking-wider mt-0.5">
                  {activeItem.optional
                    ? "Bloco opcional • Se houver tempo"
                    : "Bloco no painel"}
                </p>
              </>
            ) : (
              <>
                <h2 className="font-display font-semibold text-base text-[var(--primary)] leading-tight">
                  {activeItem?.text ?? ""}
                </h2>
                <p className="text-2xs text-[var(--ink-muted)] uppercase tracking-wider mt-0.5">
                  Tradução do Novo Mundo
                </p>
              </>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={closePanel}
            className="h-8 w-8 shrink-0 text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--background)] rounded-full"
            aria-label="Fechar painel"
            tabIndex={isPanelOpen ? 0 : -1}
          >
            <X size={18} />
          </Button>
        </div>

        {/* CONTEÚDO — scrollável independentemente */}
        <div className="verse-panel-body">
          {activeItem?.kind === "block" ? (
            editable ? (
              <div className="flex flex-col h-full min-h-[360px]">
                <textarea
                  ref={textareaRef}
                  value={localBody}
                  onChange={(e) => handleBodyChange(e.target.value)}
                  onBlur={handleBlur}
                  placeholder="Escreva aqui o conteúdo deste bloco..."
                  className="w-full flex-1 min-h-[300px] resize-none bg-transparent border-0 p-0 font-sans text-sm sm:text-base text-[var(--ink)] placeholder:text-[var(--ink-muted)]/50 focus:outline-none focus:ring-0 leading-relaxed"
                />
              </div>
            ) : (
              <div
                className="whitespace-pre-wrap font-sans text-[var(--ink)] leading-relaxed"
                style={{ fontSize: fontSize ? `${fontSize}px` : "1rem" }}
              >
                {activeItem.body.trim().length > 0 ? (
                  activeItem.body
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
