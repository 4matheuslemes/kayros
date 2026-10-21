"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  useRef,
  useMemo,
} from "react";
import { Loader2, BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { findBookByName } from "@/lib/bible/bible-books";

export interface VerseResult {
  label: string; // ex: "Mateus 28:7-9" ou "João 3:16"
  book: number;
  chapter: number;
  verse: number;
  verseEnd: number | null;
  preview: string;
}

interface VerseSuggestionListProps {
  query: string;
  command: (item: VerseResult) => void;
}

// Aceita: "Mateus 28", "Mateus 28:7", "Mateus 28:7-9", "1 Samuel 3:16", "João 3.16"
const REFERENCE_REGEX =
  /^([\wçãõáéíóúâêôàüÇÃÕÁÉÍÓÚÂÊÔÀÜ\s]+?)\s+(\d+)(?:[:.,](\d+)(?:-(\d+))?)?$/i;

export const VerseSuggestionList = forwardRef<
  { onKeyDown: (props: { event: KeyboardEvent }) => boolean },
  VerseSuggestionListProps
>(({ query, command }, ref) => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<VerseResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    setSelectedIndex(0);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query || query.trim().length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const match = query.match(REFERENCE_REGEX);
      if (!match) {
        setResults([]);
        return;
      }

      const [, bookQuery, chapterStr, verseStartStr, verseEndStr] = match;
      const book = findBookByName(bookQuery.trim());
      if (!book) {
        setResults([]);
        return;
      }

      const chapter = parseInt(chapterStr, 10);
      const verseStart = verseStartStr ? parseInt(verseStartStr, 10) : undefined;
      const verseEnd = verseEndStr ? parseInt(verseEndStr, 10) : undefined;

      setLoading(true);

      let q = supabase
        .from("bible_verses")
        .select("book_number, book_name, chapter, verse, text")
        .eq("book_number", book.number)
        .eq("chapter", chapter);

      if (verseStart !== undefined && verseEnd !== undefined) {
        q = q.gte("verse", verseStart).lte("verse", verseEnd);
      } else if (verseStart !== undefined) {
        q = q.eq("verse", verseStart);
      }

      const { data, error } = await q.order("verse", { ascending: true }).limit(50);

      if (error) {
        console.error("Erro ao buscar versículo:", error);
        setResults([]);
        setLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        setResults([]);
        setLoading(false);
        return;
      }

      if (verseStart !== undefined && verseEnd !== undefined) {
        // Intervalo — um único item representando o intervalo completo
        setResults([
          {
            label: `${book.name} ${chapter}:${verseStart}-${verseEnd}`,
            book: book.number,
            chapter,
            verse: verseStart,
            verseEnd,
            preview: data.map((v) => v.text).join(" "),
          },
        ]);
      } else {
        // Versículo único ou lista de versículos do capítulo
        setResults(
          data.map((v) => ({
            label: `${book.name} ${chapter}:${v.verse}`,
            book: book.number,
            chapter,
            verse: v.verse,
            verseEnd: null,
            preview: v.text,
          }))
        );
      }

      setLoading(false);
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, supabase]);

  const selectItem = (index: number) => {
    const item = results[index];
    if (item) command(item);
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowUp") {
        setSelectedIndex((i) => (i + results.length - 1) % Math.max(results.length, 1));
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelectedIndex((i) => (i + 1) % Math.max(results.length, 1));
        return true;
      }
      if (event.key === "Enter") {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  return (
    <div className="w-72 max-h-72 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg py-1">
      {loading && (
        <div className="flex justify-center py-4">
          <Loader2 size={16} className="animate-spin text-[var(--ink-muted)]" />
        </div>
      )}

      {!loading && query.length >= 2 && results.length === 0 && (
        <p className="px-3 py-3 text-xs text-[var(--ink-muted)]">
          Nenhum versículo encontrado.
          <br />
          Digite &ldquo;Livro Capítulo:Versículo&rdquo; (ex: João 3:16 ou Mateus 28:7-9)
        </p>
      )}

      {!loading &&
        results.map((item, index) => (
          <button
            key={`${item.book}-${item.chapter}-${item.verse}-${item.verseEnd ?? ""}`}
            type="button"
            onClick={() => selectItem(index)}
            onMouseEnter={() => setSelectedIndex(index)}
            className={`w-full text-left px-3 py-2 flex flex-col gap-0.5 transition-colors cursor-pointer ${
              index === selectedIndex ? "bg-[var(--accent)]/10" : ""
            }`}
          >
            <div className="flex items-center gap-1.5 text-sm font-medium text-[var(--primary)]">
              <BookOpen size={12} className="opacity-70" />
              {item.label}
            </div>
            <div className="text-xs text-[var(--ink-muted)] line-clamp-2">
              {item.preview}
            </div>
          </button>
        ))}
    </div>
  );
});

VerseSuggestionList.displayName = "VerseSuggestionList";
