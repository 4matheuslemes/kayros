import { getBookName } from "@/lib/bible/bible-books";

export interface VerseCount {
  key: string;
  book: number;
  chapter: number;
  verse: number;
  verseEnd: number | null;
  label: string;
  count: number;
}

export function formatVerseRef(
  book: number,
  chapter: number,
  verse: number,
  verseEnd?: number | null
): string {
  const end = verseEnd && verseEnd !== verse ? `-${verseEnd}` : "";
  return `${getBookName(book)} ${chapter}:${verse}${end}`;
}

/**
 * Percorre recursivamente os docs Tiptap e conta nós `bibleVerse`
 * por book+chapter+verse(+verseEnd). Ordena por frequência descrescente.
 */
export function countVerses(contents: any[]): VerseCount[] {
  const map = new Map<string, VerseCount>();

  const walk = (node: any) => {
    if (!node || typeof node !== "object") return;
    if (node.type === "bibleVerse" && node.attrs) {
      const { book, chapter, verse } = node.attrs;
      const verseEnd = node.attrs.verseEnd ?? null;
      if (book && chapter && verse) {
        const key = `${book}:${chapter}:${verse}:${verseEnd ?? ""}`;
        const existing = map.get(key);
        if (existing) {
          existing.count++;
        } else {
          map.set(key, {
            key,
            book,
            chapter,
            verse,
            verseEnd,
            label: formatVerseRef(book, chapter, verse, verseEnd),
            count: 1,
          });
        }
      }
    }
    if (Array.isArray(node.content)) {
      node.content.forEach(walk);
    }
  };

  contents.forEach(walk);
  return [...map.values()].sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label)
  );
}
