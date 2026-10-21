"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Search, Plus, Loader2, Quote, Flame } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { AppHeader } from "@/components/layout/app-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useDebounce } from "@/hooks/use-debounce";
import { formatVerseRef, countVerses, type VerseCount } from "@/lib/discursos/verse-stats";
import { computeWordCount } from "@/lib/discursos/outline-utils";
import { cn } from "@/lib/utils";

interface VerseHit {
  book_number: number;
  chapter: number;
  verse: number;
  text: string;
}

const RESULT_LIMIT = 50;

export function BibleSearchClient() {
  const params = useSearchParams();
  const outlineId = params.get("outline");
  const supabase = useMemo(() => createClient(), []);

  const [query, setQuery] = useState("");
  const debounced = useDebounce(query.trim(), 400);
  const [results, setResults] = useState<VerseHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [top, setTop] = useState<VerseCount[]>([]);
  const [topLoading, setTopLoading] = useState(true);
  const [inserting, setInserting] = useState<string | null>(null);

  // ---------- Busca por palavra-chave ----------
  useEffect(() => {
    if (debounced.length < 2) {
      setResults([]);
      setSearchError(null);
      return;
    }

    let cancelled = false;

    (async () => {
      setSearching(true);
      setSearchError(null);

      const { data, error } = await supabase
        .from("bible_verses")
        .select("book_number, chapter, verse, text")
        .textSearch("text_search", debounced, {
          type: "plain",
          config: "portuguese",
        })
        .order("book_number")
        .order("chapter")
        .order("verse")
        .limit(RESULT_LIMIT);

      if (cancelled) return;

      if (error) {
        console.error("Erro na busca bíblica:", error);
        setSearchError(error.message || "Erro desconhecido na busca");
        setResults([]);
      } else {
        setResults((data as VerseHit[]) ?? []);
      }

      setSearching(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [debounced, supabase]);

  // ---------- Versículos mais citados pelo usuário (sob demanda) ----------
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data } = await supabase.from("outlines").select("content");
      if (cancelled) return;
      setTop(countVerses((data ?? []).map((o: any) => o.content)).slice(0, 15));
      setTopLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  // ---------- Inserir no esboço ----------
  async function insertInto(
    key: string,
    v: { book: number; chapter: number; verse: number; verseEnd?: number | null }
  ) {
    if (!outlineId) return;
    setInserting(key);

    const { data: outline, error } = await supabase
      .from("outlines")
      .select("content")
      .eq("id", outlineId)
      .single();

    if (error || !outline) {
      toast.error("Não foi possível acessar o esboço.");
      setInserting(null);
      return;
    }

    const doc = outline.content?.type === "doc" ? outline.content : { type: "doc", content: [] };
    const node = {
      type: "paragraph",
      content: [
        {
          type: "bibleVerse",
          attrs: {
            book: v.book,
            chapter: v.chapter,
            verse: v.verse,
            verseEnd: v.verseEnd ?? null,
            text: formatVerseRef(v.book, v.chapter, v.verse, v.verseEnd),
          },
        },
      ],
    };

    const newContent = { ...doc, content: [...(doc.content ?? []), node] };
    const { error: upErr } = await supabase
      .from("outlines")
      .update({ content: newContent, word_count: computeWordCount(newContent) })
      .eq("id", outlineId);

    setInserting(null);
    if (upErr) {
      toast.error("Erro ao inserir versículo.");
    } else {
      toast.success("Versículo adicionado ao fim do esboço.");
    }
  }

  const InsertBtn = ({ k, v }: { k: string; v: any }) =>
    outlineId ? (
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="h-8 px-3 rounded-full shrink-0 text-xs text-[var(--verse-accent)] border-[var(--verse-accent)]/30 hover:bg-[var(--verse-accent-bg)]"
        disabled={inserting === k}
        onClick={() => insertInto(k, v)}
      >
        {inserting === k ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <>
            <Plus size={13} className="mr-1" /> Inserir
          </>
        )}
      </Button>
    ) : null;

  return (
    <div className="flex flex-col gap-5 pb-24 max-w-3xl mx-auto w-full">
      <AppHeader
        title="Buscar na Bíblia"
        subtitle={outlineId ? "Insira versículos diretamente no seu esboço" : "Busca textual na Tradução do Novo Mundo"}
        right={
          <Link
            href={outlineId ? `/discursos/${outlineId}` : "/discursos"}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "h-9 rounded-full text-xs text-[var(--ink-muted)] hover:text-[var(--ink)]"
            )}
          >
            <ArrowLeft size={16} className="mr-1" />
            {outlineId ? "Voltar ao esboço" : "Voltar"}
          </Link>
        }
      />

      {/* Campo de busca */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-[var(--ink-muted)]" />
        <Input
          id="bible-keyword-search"
          placeholder="Digite palavras ou termos (ex: fé, esperança, amor)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 h-11 bg-[var(--surface)] border-[var(--border)] shadow-xs rounded-xl text-sm"
        />
      </div>

      {/* Resultados da busca textual */}
      {debounced.length >= 2 && (
        <section className="flex flex-col gap-3" aria-label="Resultados da busca">
          {searching ? (
            <div className="flex justify-center py-10 text-[var(--ink-muted)]">
              <Loader2 className="animate-spin h-6 w-6 text-[var(--primary)]" />
            </div>
          ) : searchError ? (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600">
              <p className="font-semibold">Erro ao executar a busca:</p>
              <p className="mt-1 opacity-90">{searchError}</p>
            </div>
          ) : results.length === 0 ? (
            <p className="text-sm text-[var(--ink-muted)] text-center py-8">
              Nenhum versículo encontrado para &ldquo;{debounced}&rdquo;.
            </p>
          ) : (
            <>
              <p className="text-xs text-[var(--ink-muted)] font-medium">
                {results.length === RESULT_LIMIT
                  ? `Mostrando os primeiros ${RESULT_LIMIT} resultados`
                  : `${results.length} resultado(s) encontrado(s)`}
              </p>
              {results.map((r) => {
                const k = `${r.book_number}:${r.chapter}:${r.verse}`;
                return (
                  <Card key={k} padding="sm" className="flex items-start gap-3 bg-[var(--surface)]">
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-semibold text-sm text-[var(--primary)] mb-1">
                        {formatVerseRef(r.book_number, r.chapter, r.verse)}
                      </p>
                      <p className="text-xs text-[var(--ink)] leading-relaxed">
                        {r.text}
                      </p>
                    </div>
                    <InsertBtn
                      k={k}
                      v={{ book: r.book_number, chapter: r.chapter, verse: r.verse }}
                    />
                  </Card>
                );
              })}
            </>
          )}
        </section>
      )}

      {/* Seus versículos mais citados (quando não há busca ativa) */}
      {debounced.length < 2 && (
        <section className="flex flex-col gap-3" aria-label="Versículos mais citados">
          <h2 className="font-display font-semibold text-base text-[var(--ink)] flex items-center gap-2">
            <Flame size={18} className="text-[var(--accent)]" />
            Seus versículos mais citados
          </h2>

          {topLoading ? (
            <div className="flex justify-center py-8 text-[var(--ink-muted)]">
              <Loader2 className="animate-spin h-5 w-5 text-[var(--primary)]" />
            </div>
          ) : top.length === 0 ? (
            <p className="text-xs text-[var(--ink-muted)] py-4">
              Cite versículos nos seus esboços e os mais frequentes aparecerão aqui automaticamente.
            </p>
          ) : (
            top.map((t, i) => (
              <Card key={t.key} padding="sm" className="flex items-center gap-3 bg-[var(--surface)]">
                <span className="w-6 text-center text-xs font-bold text-[var(--ink-muted)] tabular-nums">
                  {i + 1}
                </span>
                <Quote size={14} className="text-[var(--primary)] shrink-0" />
                <span className="flex-1 min-w-0 truncate font-medium text-xs text-[var(--ink)]">
                  {t.label}
                </span>
                <span className="text-xs text-[var(--ink-muted)] tabular-nums font-semibold px-2 py-0.5 rounded-full bg-[var(--background)] border border-[var(--border)]">
                  {t.count}×
                </span>
                <InsertBtn k={t.key} v={t} />
              </Card>
            ))
          )}
        </section>
      )}
    </div>
  );
}
