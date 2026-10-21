/**
 * Lógica compartilhada de exportação de esboços (PDF + texto para transferir).
 *
 * Roda tanto no cliente (texto/Transferir) quanto no servidor (PDF), por isso
 * não depende de nada específico de ambiente: recebe o cliente Supabase por parâmetro.
 */
import { formatVerseRef } from "@/lib/discursos/verse-stats";

// ============================================================
// MODELO INTERMEDIÁRIO
// ============================================================

export interface VerseRef {
  key: string;
  book: number;
  chapter: number;
  verse: number;
  verseEnd: number | null;
  label: string;
}

export interface ExportInline {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  backstage?: boolean;
  /** Quando preenchido, este trecho é a referência de um versículo citado */
  verse?: VerseRef;
}

export type ExportBlock =
  | { type: "heading"; level: number; inlines: ExportInline[]; verses: VerseRef[] }
  | { type: "paragraph"; inlines: ExportInline[]; verses: VerseRef[] }
  | { type: "list"; ordered: boolean; start: number; items: ExportBlock[][] }
  | { type: "blockquote"; blocks: ExportBlock[] }
  | { type: "code"; text: string }
  | { type: "rule" };

export interface BuildOptions {
  /** Inclui trechos marcados como "Nota de Bastidor" (uso pessoal, não de envio) */
  includeBackstage: boolean;
}

export interface VerseText {
  label: string;
  verses: { verse: number; text: string }[];
}

export type VerseTextMap = Map<string, VerseText>;

// ============================================================
// TIPTAP JSON -> BLOCOS
// ============================================================

export function verseRefFromAttrs(attrs: any): VerseRef | null {
  if (!attrs?.book || !attrs?.chapter || !attrs?.verse) return null;
  const verseEnd =
    attrs.verseEnd && attrs.verseEnd !== attrs.verse ? attrs.verseEnd : null;
  return {
    key: `${attrs.book}:${attrs.chapter}:${attrs.verse}:${verseEnd ?? ""}`,
    book: attrs.book,
    chapter: attrs.chapter,
    verse: attrs.verse,
    verseEnd,
    label: formatVerseRef(attrs.book, attrs.chapter, attrs.verse, verseEnd),
  };
}

function inlinesOf(node: any, opts: BuildOptions): ExportInline[] {
  const out: ExportInline[] = [];

  const walk = (n: any) => {
    if (!n || typeof n !== "object") return;

    if (n.type === "text" && typeof n.text === "string") {
      const marks: string[] = (n.marks ?? []).map((m: any) => m.type);
      const backstage = marks.includes("backstage");
      if (backstage && !opts.includeBackstage) return;
      out.push({
        text: n.text,
        bold: marks.includes("bold"),
        italic: marks.includes("italic"),
        underline: marks.includes("underline"),
        backstage,
      });
      return;
    }

    if (n.type === "bibleVerse") {
      const ref = verseRefFromAttrs(n.attrs);
      if (ref) out.push({ text: ref.label, bold: true, verse: ref });
      return;
    }

    if (n.type === "hardBreak") {
      out.push({ text: "\n" });
      return;
    }

    if (Array.isArray(n.content)) n.content.forEach(walk);
  };

  walk(node);
  return out;
}

function versesOf(inlines: ExportInline[]): VerseRef[] {
  const seen = new Set<string>();
  const refs: VerseRef[] = [];
  for (const i of inlines) {
    if (i.verse && !seen.has(i.verse.key)) {
      seen.add(i.verse.key);
      refs.push(i.verse);
    }
  }
  return refs;
}

function plainOf(node: any): string {
  if (!node) return "";
  if (node.type === "text") return node.text ?? "";
  if (Array.isArray(node.content)) return node.content.map(plainOf).join("");
  return "";
}

export function buildBlocks(nodes: any[] | undefined, opts: BuildOptions): ExportBlock[] {
  const blocks: ExportBlock[] = [];

  for (const node of nodes ?? []) {
    switch (node.type) {
      case "heading": {
        const inlines = inlinesOf(node, opts);
        if (inlines.length === 0) break;
        blocks.push({
          type: "heading",
          level: node.attrs?.level ?? 2,
          inlines,
          verses: versesOf(inlines),
        });
        break;
      }
      case "paragraph": {
        const inlines = inlinesOf(node, opts);
        // Parágrafo vazio ou só com bastidor omitido: ignora
        if (inlines.length === 0 || inlines.every((i) => !i.text.trim())) break;
        blocks.push({ type: "paragraph", inlines, verses: versesOf(inlines) });
        break;
      }
      case "bulletList":
      case "orderedList":
        blocks.push({
          type: "list",
          ordered: node.type === "orderedList",
          start: node.attrs?.start ?? 1,
          items: (node.content ?? []).map((li: any) => buildBlocks(li.content, opts)),
        });
        break;
      case "blockquote":
        blocks.push({ type: "blockquote", blocks: buildBlocks(node.content, opts) });
        break;
      case "codeBlock":
        blocks.push({ type: "code", text: plainOf(node) });
        break;
      case "horizontalRule":
        blocks.push({ type: "rule" });
        break;
      default:
        if (Array.isArray(node.content)) blocks.push(...buildBlocks(node.content, opts));
    }
  }

  return blocks;
}

// ============================================================
// BUSCA DOS TEXTOS DOS VERSÍCULOS
// ============================================================

export function collectVerseRefs(blocks: ExportBlock[]): VerseRef[] {
  const map = new Map<string, VerseRef>();

  const walk = (bs: ExportBlock[]) => {
    for (const b of bs) {
      if (b.type === "heading" || b.type === "paragraph") {
        b.verses.forEach((v) => map.set(v.key, v));
      } else if (b.type === "list") {
        b.items.forEach(walk);
      } else if (b.type === "blockquote") {
        walk(b.blocks);
      }
    }
  };

  walk(blocks);
  return [...map.values()];
}

/**
 * Busca em `bible_verses` o texto completo de cada referência.
 * `supabase` pode ser o client de navegador ou o de servidor.
 */
export async function fetchVerseTexts(
  supabase: any,
  refs: VerseRef[]
): Promise<VerseTextMap> {
  const map: VerseTextMap = new Map();

  await Promise.all(
    refs.map(async (ref) => {
      const { data, error } = await supabase
        .from("bible_verses")
        .select("verse, text")
        .eq("book_number", ref.book)
        .eq("chapter", ref.chapter)
        .gte("verse", ref.verse)
        .lte("verse", ref.verseEnd ?? ref.verse)
        .order("verse", { ascending: true });

      if (!error && data?.length) {
        map.set(ref.key, { label: ref.label, verses: data });
      }
    })
  );

  return map;
}

/** Junta os versículos de uma referência num único texto corrido. */
export function joinVerseText(vt: VerseText): string {
  if (vt.verses.length === 1) return vt.verses[0].text;
  return vt.verses.map((v) => `(${v.verse}) ${v.text}`).join(" ");
}

// ============================================================
// TEXTO SIMPLES (Transferir)
// ============================================================

function inlineToText(i: ExportInline, wa: boolean): string {
  if (i.verse || !wa || !i.text.trim()) return i.text;
  // Formatação estilo WhatsApp: *negrito* e _itálico_
  let t = i.text;
  const lead = t.match(/^\s*/)![0];
  const trail = t.match(/\s*$/)![0];
  const core = t.trim();
  if (i.bold) t = `*${core}*`;
  else if (i.italic) t = `_${core}_`;
  else return t;
  return lead + t + trail;
}

function renderBlocksText(
  blocks: ExportBlock[],
  texts: VerseTextMap,
  indent: string,
  out: string[]
) {
  const verseLines = (verses: VerseRef[]) => {
    for (const ref of verses) {
      const vt = texts.get(ref.key);
      out.push(
        vt
          ? `${indent}   › ${ref.label}: “${joinVerseText(vt)}”`
          : `${indent}   › ${ref.label}`
      );
    }
  };

  for (const b of blocks) {
    switch (b.type) {
      case "heading": {
        const t = b.inlines.map((i) => i.text).join("").trim();
        out.push("", `${indent}*${t}*`);
        verseLines(b.verses);
        break;
      }
      case "paragraph":
        out.push(`${indent}${b.inlines.map((i) => inlineToText(i, true)).join("").trim()}`);
        verseLines(b.verses);
        break;
      case "list":
        b.items.forEach((item, idx) => {
          const marker = b.ordered ? `${b.start + idx}. ` : "• ";
          const sub: string[] = [];
          renderBlocksText(item, texts, indent + "   ", sub);
          if (sub.length === 0) return;
          const first = sub.findIndex((l) => l.trim() !== "");
          if (first === -1) return;
          sub[first] = indent + marker + sub[first].slice(indent.length + 3);
          out.push(...sub);
        });
        break;
      case "blockquote": {
        const sub: string[] = [];
        renderBlocksText(b.blocks, texts, indent, sub);
        out.push(...sub.map((l) => `> ${l}`));
        break;
      }
      case "code":
        out.push(b.text);
        break;
      case "rule":
        out.push("———");
        break;
    }
  }
}

export function renderPlainText(blocks: ExportBlock[], texts: VerseTextMap): string {
  const out: string[] = [];
  renderBlocksText(blocks, texts, "", out);
  return out
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Mensagem completa de "Transferir". Nunca inclui notas de bastidor. */
export async function buildTransferMessage(
  supabase: any,
  title: string,
  category: string | null | undefined,
  content: any
): Promise<string> {
  const blocks = buildBlocks(content?.content, { includeBackstage: false });
  const texts = await fetchVerseTexts(supabase, collectVerseRefs(blocks));
  const name = title.trim() || "Sem título";
  const body = renderPlainText(blocks, texts);
  const catLine = category ? `${category}\n` : "";
  return `Compartilhando o esboço '${name}' com você:\n\n*${name}*\n${catLine}${body ? `\n${body}` : ""}`;
}
