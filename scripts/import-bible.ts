import AdmZip from "adm-zip";
import { parse, HTMLElement, TextNode } from "node-html-parser";
import { createClient } from "@supabase/supabase-js";
import { resolve } from "path";
import * as dotenv from "dotenv";

// Load environment variables from Kairós project root (.env.local)
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ ERRO: Faltam variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const epubPath = resolve(process.cwd(), "scripts/bible-source/nwt_T.epub");

const BIBLE_BOOKS = [
  { number: 1, name: "Gênesis" }, { number: 2, name: "Êxodo" }, { number: 3, name: "Levítico" },
  { number: 4, name: "Números" }, { number: 5, name: "Deuteronômio" }, { number: 6, name: "Josué" },
  { number: 7, name: "Juízes" }, { number: 8, name: "Rute" }, { number: 9, name: "1 Samuel" },
  { number: 10, name: "2 Samuel" }, { number: 11, name: "1 Reis" }, { number: 12, name: "2 Reis" },
  { number: 13, name: "1 Crônicas" }, { number: 14, name: "2 Crônicas" }, { number: 15, name: "Esdras" },
  { number: 16, name: "Neemias" }, { number: 17, name: "Ester" }, { number: 18, name: "Jó" },
  { number: 19, name: "Salmos" }, { number: 20, name: "Provérbios" }, { number: 21, name: "Eclesiastes" },
  { number: 22, name: "Cantares" }, { number: 23, name: "Isaías" }, { number: 24, name: "Jeremias" },
  { number: 25, name: "Lamentações" }, { number: 26, name: "Ezequiel" }, { number: 27, name: "Daniel" },
  { number: 28, name: "Oseias" }, { number: 29, name: "Joel" }, { number: 30, name: "Amós" },
  { number: 31, name: "Obadias" }, { number: 32, name: "Jonas" }, { number: 33, name: "Miquéias" },
  { number: 34, name: "Naum" }, { number: 35, name: "Habacuque" }, { number: 36, name: "Sofonias" },
  { number: 37, name: "Ageu" }, { number: 38, name: "Zacarias" }, { number: 39, name: "Malaquias" },
  { number: 40, name: "Mateus" }, { number: 41, name: "Marcos" }, { number: 42, name: "Lucas" },
  { number: 43, name: "João" }, { number: 44, name: "Atos" }, { number: 45, name: "Romanos" },
  { number: 46, name: "1 Coríntios" }, { number: 47, name: "2 Coríntios" }, { number: 48, name: "Gálatas" },
  { number: 49, name: "Efésios" }, { number: 50, name: "Filipenses" }, { number: 51, name: "Colossenses" },
  { number: 52, name: "1 Tessalonicenses" }, { number: 53, name: "2 Tessalonicenses" },
  { number: 54, name: "1 Timóteo" }, { number: 55, name: "2 Timóteo" }, { number: 56, name: "Tito" },
  { number: 57, name: "Filêmon" }, { number: 58, name: "Hebreus" }, { number: 59, name: "Tiago" },
  { number: 60, name: "1 Pedro" }, { number: 61, name: "2 Pedro" }, { number: 62, name: "1 João" },
  { number: 63, name: "2 João" }, { number: 64, name: "3 João" }, { number: 65, name: "Judas" },
  { number: 66, name: "Apocalipse" }
];

interface VerseRecord {
  book_number: number;
  book_name: string;
  chapter: number;
  verse: number;
  text: string;
}

async function importBible() {
  console.log("📖 Lendo arquivo EPUB da Bíblia:", epubPath);
  const zip = new AdmZip(epubPath);
  const zipEntries = zip.getEntries();

  const contentOpfEntry = zipEntries.find((e) => e.entryName.endsWith("content.opf"));
  if (!contentOpfEntry) {
    throw new Error("Arquivo content.opf não encontrado no EPUB");
  }

  const opfContent = contentOpfEntry.getData().toString("utf8");
  const opfRoot = parse(opfContent);

  const items: Record<string, string> = {};
  opfRoot.querySelectorAll("item").forEach((item) => {
    items[item.getAttribute("id") || ""] = item.getAttribute("href") || "";
  });

  const spineItemRefs = opfRoot
    .querySelectorAll("itemref")
    .map((ref) => ref.getAttribute("idref") || "");
  const orderedFiles = spineItemRefs
    .map((idref) => items[idref])
    .filter((href) => href && href.endsWith(".xhtml"));

  console.log(`📄 Encontrados ${orderedFiles.length} arquivos no spine do EPUB.`);

  const versesBuffer: VerseRecord[] = [];
  let currentBookNumber = 0;
  let currentBookName = "";

  for (const filename of orderedFiles) {
    const entry = zipEntries.find((e) => e.entryName === `OEBPS/${filename}`);
    if (!entry) continue;

    const html = entry.getData().toString("utf8");
    const root = parse(html);

    const bookNav = root.querySelector("a[href='biblebooknav.xhtml']");
    if (bookNav) {
      const parsedBookName = bookNav.text.trim();
      const matchedBook = BIBLE_BOOKS.find(
        (b) => b.name === parsedBookName || parsedBookName.includes(b.name)
      );
      if (matchedBook) {
        currentBookNumber = matchedBook.number;
        currentBookName = matchedBook.name;
      }
    }

    if (currentBookNumber === 0) continue;

    const pTags = root.querySelectorAll("p");

    for (const p of pTags) {
      if (!p.innerHTML.includes('id="chapter')) continue;

      let currentChapter = 0;
      let currentVerse = 0;
      let currentVerseText = "";

      for (const node of p.childNodes) {
        if (node.nodeType === 1) {
          const el = node as HTMLElement;
          const id = el.getAttribute("id");

          if (id && id.startsWith("chapter")) {
            const match = id.match(/chapter(\d+)_verse(\d+)/);
            if (match) {
              if (currentVerse > 0 && currentVerseText.trim().length > 0) {
                versesBuffer.push({
                  book_number: currentBookNumber,
                  book_name: currentBookName,
                  chapter: currentChapter,
                  verse: currentVerse,
                  text: currentVerseText.trim().replace(/\s+/g, " "),
                });
              }

              currentChapter = parseInt(match[1], 10);
              currentVerse = parseInt(match[2], 10);
              currentVerseText = "";
              continue;
            }
          }

          if (el.tagName === "A" && el.getAttribute("epub:type") === "noteref") continue;
          if (el.tagName === "STRONG" && el.querySelector("sup")) continue;
          if (el.getAttribute("id") && el.getAttribute("id")?.startsWith("footnotesource")) continue;

          if (currentVerse > 0) {
            currentVerseText += el.text;
          }
        } else if (node.nodeType === 3) {
          if (currentVerse > 0) {
            currentVerseText += (node as TextNode).text;
          }
        }
      }

      if (currentVerse > 0 && currentVerseText.trim().length > 0) {
        versesBuffer.push({
          book_number: currentBookNumber,
          book_name: currentBookName,
          chapter: currentChapter,
          verse: currentVerse,
          text: currentVerseText.trim().replace(/\s+/g, " "),
        });
      }
    }
  }

  console.log(`✅ Extração concluída: ${versesBuffer.length} versículos extraídos do EPUB.`);

  if (versesBuffer.length === 0) {
    console.error("❌ Nenhum versículo extraído. Verifique o arquivo EPUB.");
    process.exit(1);
  }

  console.log("🧹 Limpando tabela bible_verses no Supabase...");
  const { error: deleteError } = await supabase.from("bible_verses").delete().neq("id", 0);
  if (deleteError) {
    console.error("Erro ao limpar bible_verses:", deleteError);
    process.exit(1);
  }

  console.log("🚀 Inserindo versículos no Supabase em lotes de 1.000...");
  const chunkSize = 1000;
  const totalChunks = Math.ceil(versesBuffer.length / chunkSize);

  for (let i = 0; i < versesBuffer.length; i += chunkSize) {
    const chunk = versesBuffer.slice(i, i + chunkSize);
    const { error: insertError } = await supabase.from("bible_verses").insert(chunk);
    if (insertError) {
      console.error(`❌ Erro no lote ${i / chunkSize + 1}:`, insertError);
      process.exit(1);
    }
    const currentChunkIndex = Math.floor(i / chunkSize) + 1;
    console.log(`   Lote ${currentChunkIndex}/${totalChunks} inserido com sucesso (${chunk.length} versículos).`);
  }

  // Conferência final
  const { count, error: countError } = await supabase
    .from("bible_verses")
    .select("*", { count: "exact", head: true });

  if (countError) {
    console.warn("Aviso ao conferir contagem:", countError);
  }

  console.log("\n=======================================================");
  console.log(`✨ Total de versículos no banco: ${count} (esperado: 31.102)`);
  console.log("=======================================================\n");

  // Conferência de João 3:16 (livro 43, cap 3, vers 16)
  const { data: joao } = await supabase
    .from("bible_verses")
    .select("book_name, chapter, verse, text")
    .eq("book_number", 43)
    .eq("chapter", 3)
    .eq("verse", 16)
    .single();

  if (joao) {
    console.log(`📌 Conferência — ${joao.book_name} ${joao.chapter}:${joao.verse}`);
    console.log(`   "${joao.text}"\n`);
  }

  // Conferência de Salmo 23:1 (livro 19, cap 23, vers 1)
  const { data: salmo } = await supabase
    .from("bible_verses")
    .select("book_name, chapter, verse, text")
    .eq("book_number", 19)
    .eq("chapter", 23)
    .eq("verse", 1)
    .single();

  if (salmo) {
    console.log(`📌 Conferência — ${salmo.book_name} ${salmo.chapter}:${salmo.verse}`);
    console.log(`   "${salmo.text}"\n`);
  }

  console.log("🎉 Carga da Bíblia finalizada com sucesso!");
}

importBible().catch((err) => {
  console.error("Erro fatal durante importação:", err);
  process.exit(1);
});
