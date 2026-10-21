import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import {
  buildBlocks,
  collectVerseRefs,
  fetchVerseTexts,
} from "@/lib/discursos/outline-export";
import { OutlinePdf } from "@/lib/discursos/outline-pdf";

export const runtime = "nodejs";

function slugify(s: string) {
  return (
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase()
      .slice(0, 60) || "esboco"
  );
}

/**
 * POST /api/discursos/export-pdf
 * Body: { title, category, content } (content = JSON do Tiptap)
 *
 * Exige usuário logado E talks_access.
 * Expande os versículos citados a partir de bible_verses e devolve o PDF.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  // Verifica acesso a discursos
  const { data: profile } = await supabase
    .from("profiles")
    .select("talks_access")
    .eq("id", user.id)
    .single();

  if (!profile?.talks_access) {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const title: string = (body?.title ?? "").toString().trim() || "Sem título";
  const category: string = (body?.category ?? "").toString();
  const content = body?.content;
  if (!content || typeof content !== "object") {
    return NextResponse.json({ error: "Conteúdo ausente." }, { status: 400 });
  }

  try {
    const blocks = buildBlocks(content.content, { includeBackstage: true });
    const texts = await fetchVerseTexts(supabase, collectVerseRefs(blocks));

    const buffer = await renderToBuffer(
      <OutlinePdf title={title} category={category} blocks={blocks} texts={texts} />
    );

    const filename = `${slugify(title)}.pdf`;
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(
          `${title}.pdf`
        )}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("export-pdf failed:", e);
    return NextResponse.json({ error: "Falha ao gerar o PDF." }, { status: 500 });
  }
}
