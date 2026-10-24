"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Check, ArrowLeft, Play, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { OutlineEditor } from "@/components/discursos/outline-editor";
import { EditorProvider } from "@/components/discursos/editor-context";
import { VersePanel } from "@/components/discursos/verse-panel";
import { ExportActions } from "@/components/discursos/export-actions";
import { PresentationHistory } from "@/components/discursos/presentation-history";
import type { JSONContent } from "@tiptap/core";
import {
  OUTLINE_CATEGORIES,
  estimateDuration,
  formatDuration,
  computeWordCount,
} from "@/lib/discursos/outline-utils";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "sonner";

interface EditorClientProps {
  id: string;
}

export function EditorClient({ id }: EditorClientProps) {
  const router = useRouter();
  const isNew = id === "novo";

  const [loading, setLoading] = useState(!isNew);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">("idle");

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>(OUTLINE_CATEGORIES[0]);
  const [content, setContent] = useState<JSONContent>({
    type: "doc",
    content: [],
  });

  const supabase = useMemo(() => createClient(), []);

  // Refs para leitura segura e sem stale closure no autosave
  const titleRef = useRef(title);
  const contentRef = useRef(content);
  const categoryRef = useRef(category);

  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    categoryRef.current = category;
  }, [category]);

  // Estimativa de duração
  const { minutes: estimatedMinutes } = useMemo(
    () => estimateDuration(content),
    [content]
  );

  // Travas essenciais para integridade do autosave
  const hasLoaded = useRef(isNew);
  const isCreating = useRef(false);

  // ============================================================
  // CARREGAR ESBOÇO EXISTENTE
  // ============================================================
  useEffect(() => {
    if (isNew) {
      hasLoaded.current = true;
      return;
    }

    hasLoaded.current = false;

    async function loadOutline() {
      const { data, error } = await supabase
        .from("outlines")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        toast.error("Erro ao carregar esboço");
        router.push("/discursos");
        return;
      }

      setTitle(data.title ?? "");
      setCategory(data.category || OUTLINE_CATEGORIES[0]);
      setContent(data.content || { type: "doc", content: [] });
      setLoading(false);

      // Libera o autosave somente após o conteúdo original do banco ter carregado
      hasLoaded.current = true;
    }

    loadOutline();
  }, [id, isNew, router, supabase]);

  // ============================================================
  // AUTOSAVE COM TRAVAS E DEBOUNCE (2.000ms)
  // ============================================================
  const debouncedContent = useDebounce(content, 2000);
  const debouncedTitle = useDebounce(title, 2000);

  useEffect(() => {
    // Nunca salvar durante o carregamento inicial
    if (!hasLoaded.current || loading) return;

    const currentTitle = titleRef.current;
    const currentContent = contentRef.current;
    const currentCategory = categoryRef.current;

    // NOVO ESBOÇO
    if (isNew) {
      // Impede múltiplos INSERTs simultâneos
      if (isCreating.current) return;

      const hasText =
        currentTitle.trim().length > 0 ||
        (currentContent?.content && currentContent.content.length > 0);

      // Não cria registro vazio
      if (!hasText) return;

      isCreating.current = true;

      async function createOutline() {
        setSaveStatus("saving");

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          isCreating.current = false;
          setSaveStatus("idle");
          return;
        }

        const { data, error } = await supabase
          .from("outlines")
          .insert({
            user_id: user.id,
            title: currentTitle.trim() || "Sem título",
            category: currentCategory,
            content: currentContent,
            word_count: computeWordCount(currentContent),
          })
          .select("id")
          .single();

        if (error || !data) {
          console.error("Erro ao criar esboço:", error);
          isCreating.current = false;
          setSaveStatus("idle");
          toast.error("Erro ao salvar esboço.");
          return;
        }

        setSaveStatus("saved");
        // Substitui a URL pelo ID gerado sem adicionar histórico
        router.replace(`/discursos/${data.id}`);
      }

      createOutline();
      return;
    }

    // ESBOÇO EXISTENTE
    async function updateOutline() {
      setSaveStatus("saving");

      const { error } = await supabase
        .from("outlines")
        .update({
          title: currentTitle.trim() || "Sem título",
          category: currentCategory,
          content: currentContent,
          word_count: computeWordCount(currentContent),
        })
        .eq("id", id);

      if (error) {
        console.error("Erro ao atualizar esboço:", error);
        setSaveStatus("idle");
        toast.error("Erro ao atualizar esboço.");
        return;
      }

      setSaveStatus("saved");
      const timer = setTimeout(() => {
        setSaveStatus("idle");
      }, 2000);

      return () => clearTimeout(timer);
    }

    updateOutline();
  }, [debouncedContent, debouncedTitle, category, id, isNew, loading, router, supabase]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  return (
    <EditorProvider>
      <div className="outline-page flex flex-col h-full gap-4 pb-24">
        {/* Top bar de navegação e status de salvamento */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined" && window.history.length > 1) {
                  router.back();
                } else {
                  router.push("/discursos");
                }
              }}
              aria-label="Voltar para discursos"
              title="Voltar"
              className="w-10 h-10 rounded-full bg-[var(--panel)] hover:bg-[var(--border)] flex items-center justify-center transition-colors text-[var(--ink)] shrink-0 active:scale-95 cursor-pointer shadow-xs"
            >
              <ArrowLeft size={20} />
            </button>
            <span className="text-body-sm font-medium text-[var(--ink-muted)] truncate">
              {isNew ? "Novo esboço" : "Editar esboço"}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap">
            {!isNew && (
              <>
                <Link
                  href={`/discursos/biblia?outline=${id}`}
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                    "h-8 px-2.5 rounded-full text-xs text-[var(--ink-muted)] hover:text-[var(--ink)]"
                  )}
                  title="Buscar versículos na Bíblia para este esboço"
                >
                  <Search size={13} className="mr-1" />
                  <span className="hidden sm:inline">Bíblia</span>
                </Link>

                <ExportActions title={title} category={category} content={content} />

                <Link
                  href={`/discursos/${id}/apresentar`}
                  className={cn(
                    buttonVariants({ variant: "primary", size: "sm" }),
                    "h-8 px-3 rounded-full text-xs gap-1.5"
                  )}
                  title="Abrir Modo Discurso (apresentação na tribuna)"
                >
                  <Play size={12} fill="currentColor" />
                  <span>Apresentar</span>
                </Link>
              </>
            )}

            {estimatedMinutes > 0 && (
              <span className="text-caption text-[var(--ink-muted)] tabular-nums hidden xs:inline">
                {formatDuration(estimatedMinutes)}
              </span>
            )}

            <div className="flex items-center gap-1 text-caption text-[var(--ink-muted)] min-w-[70px] justify-end">
              {saveStatus === "saving" && (
                <>
                  <Loader2 size={12} className="animate-spin text-[var(--ink-muted)]" />
                  <span>Salvando</span>
                </>
              )}
              {saveStatus === "saved" && (
                <>
                  <Check size={12} className="text-[var(--success)]" />
                  <span className="text-[var(--success)]">Salvo</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Metadados: Título e Categoria */}
        <div className="flex flex-col gap-2.5">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título do esboço..."
            className="text-2xl font-display font-semibold h-auto py-1 px-0 border-transparent bg-transparent shadow-none focus:border-transparent focus:ring-0 placeholder:text-[var(--ink-muted)]/50"
          />

          <div className="flex items-center gap-2">
            <label htmlFor="outline-category" className="sr-only">
              Categoria do esboço
            </label>
            <select
              id="outline-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-8 rounded-lg px-2.5 text-xs font-medium bg-[var(--surface)] border border-[var(--border)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              {OUTLINE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Editor + VersePanel em Split View */}
        <div className="editor-with-panel mt-1">
          <div className="min-w-0 w-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 shadow-sm">
            <OutlineEditor initialContent={content} onChange={setContent} />
          </div>

          <VersePanel />
        </div>

        {/* Histórico de apresentações (somente para esboços existentes) */}
        {!isNew && <PresentationHistory outlineId={id} />}
      </div>
    </EditorProvider>
  );
}
