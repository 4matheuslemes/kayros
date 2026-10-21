import type { JSONContent } from "@tiptap/core";

export const OUTLINE_CATEGORIES = [
  "Discurso público",
  "Vida e Ministério",
  "Estudo d'A Sentinela",
  "Estudo de congregação",
  "Discurso de batismo",
  "Outro",
] as const;

export type OutlineCategory = (typeof OUTLINE_CATEGORIES)[number];

/**
 * Extrai texto puro do JSON serializado do Tiptap.
 * Ignora marcação, nós de bíblia, etc.
 * Retorna apenas o conteúdo textual concatenado.
 */
export function extractPlainText(doc: JSONContent | null | undefined): string {
  if (!doc || typeof doc !== "object") return "";

  // Nó com texto direto
  if (doc.type === "text" && typeof doc.text === "string") {
    return doc.text;
  }

  // Nó bible-verse: usa o atributo `text` como representação de texto
  if (doc.type === "bibleVerse" && doc.attrs?.text) {
    return ` ${doc.attrs.text} `;
  }

  // Nós com filhos
  if (Array.isArray(doc.content)) {
    return doc.content.map(extractPlainText).join(" ");
  }

  return "";
}

/**
 * Conta palavras em um texto plano.
 * Divide por espaços/newlines e filtra strings vazias.
 */
export function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

/** Palavras → minutos (138 wpm é um valor central confortável para fala expositiva em português). */
export function minutesFromWords(words: number): number {
  return Math.round(words / 138);
}

/** Contagem de palavras de um doc Tiptap — valor gravado em outlines.word_count. */
export function computeWordCount(doc: JSONContent | null | undefined): number {
  return countWords(extractPlainText(doc));
}

/**
 * Estima a duração de leitura/fala com base na contagem de palavras.
 * Ritmo médio de fala em português: 130-145 palavras por minuto (usando 138 wpm).
 *
 * Retorna um objeto { words, minutes } para flexibilidade de exibição.
 */
export function estimateDuration(doc: JSONContent | null | undefined): { words: number; minutes: number } {
  const words = computeWordCount(doc);
  return { words, minutes: minutesFromWords(words) };
}

/**
 * Formata a estimativa para exibição.
 * Ex: "~5 min" | "~1 h 2 min" | "< 1 min"
 */
export function formatDuration(minutes: number): string {
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `~${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `~${h} h ${m} min` : `~${h} h`;
}

export interface DocSection {
  /** Texto do heading que abre esta seção, ou null se for o preâmbulo */
  heading: string | null;
  /** Nível do heading (1 ou 2), ou null */
  level: 1 | 2 | null;
  /** Nós ProseMirror desta seção (excluindo o próprio heading) */
  nodes: JSONContent[];
}

export function splitByHeadings(doc: JSONContent | null | undefined): DocSection[] {
  const nodes: JSONContent[] = doc?.content ?? [];
  const sections: DocSection[] = [];
  let current: DocSection = { heading: null, level: null, nodes: [] };

  for (const node of nodes) {
    if (
      node.type === "heading" &&
      (node.attrs?.level === 1 || node.attrs?.level === 2)
    ) {
      // Só salva a seção atual se tiver conteúdo OU título
      if (current.heading !== null || current.nodes.length > 0) {
        sections.push(current);
      }
      // Inicia nova seção com este heading como título
      const headingText = extractPlainText(node).trim();
      current = {
        heading: headingText || null,
        level: node.attrs.level,
        nodes: [],
      };
    } else {
      current.nodes.push(node);
    }
  }

  // Adiciona a última seção (sempre, mesmo que vazia — garante pelo menos 1 cartão)
  sections.push(current);

  return sections;
}
