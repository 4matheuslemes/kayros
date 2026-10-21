"use client";

import { useEffect, useState, useMemo } from "react";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEditorContext } from "./editor-context";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface VerseContent {
  verse: number;
  text: string;
}

export function VersePanel() {
  const { isPanelOpen, closeVersePanel, selectedVerse } = useEditorContext();
  const [verseContent, setVerseContent] = useState<VerseContent[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  /*
   * Inicia o fetch assim que selectedVerse muda —
   * antes mesmo da transição do painel concluir.
   */
  useEffect(() => {
    if (!selectedVerse) return;

    const verse = selectedVerse;

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
  }, [selectedVerse, supabase]);

  // Fechar com tecla Escape
  useEffect(() => {
    if (!isPanelOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeVersePanel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isPanelOpen, closeVersePanel]);

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
        aria-label="Painel de versículo"
        className="verse-panel-inner"
      >
        {/* HEADER */}
        <div className="verse-panel-header">
          <div className="min-w-0 pr-2">
            <h2 className="font-display font-semibold text-base text-[var(--primary)] leading-tight">
              {selectedVerse?.text ?? ""}
            </h2>
            <p className="text-2xs text-[var(--ink-muted)] uppercase tracking-wider mt-0.5">
              Tradução do Novo Mundo
            </p>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={closeVersePanel}
            className="h-8 w-8 shrink-0 text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--background)] rounded-full"
            aria-label="Fechar painel"
            tabIndex={isPanelOpen ? 0 : -1}
          >
            <X size={18} />
          </Button>
        </div>

        {/* CONTEÚDO — scrollável independentemente */}
        <div className="verse-panel-body">
          {loading ? (
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
                  style={{ fontSize: "1rem" }}
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
