"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, BookOpenText, Trash2, Copy, Play } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { cn, formatRelativeDate } from "@/lib/utils";
import { minutesFromWords, formatDuration } from "@/lib/discursos/outline-utils";
import { DeleteOutlineDialog } from "@/components/discursos/delete-outline-dialog";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";

interface OutlineItem {
  id: string;
  title: string;
  category: string | null;
  updated_at: string;
  word_count: number;
}

export function DiscursosClient({ userId }: { userId: string }) {
  const router = useRouter();
  const [outlines, setOutlines] = useState<OutlineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const debouncedSearch = useDebounce(search, 300);
  const supabase = useMemo(() => createClient(), []);

  // Modal de exclusão
  const [outlineToDelete, setOutlineToDelete] = useState<OutlineItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function load() {
      let q = supabase
        .from("outlines")
        .select("id, title, category, updated_at, word_count")
        .order("updated_at", { ascending: false });

      if (debouncedSearch.trim()) {
        q = q.ilike("title", `%${debouncedSearch.trim()}%`);
      }

      const { data, error } = await q;
      if (ignore) return;
      if (error) {
        console.error("Erro ao buscar esboços:", error);
        toast.error("Erro ao carregar esboços.");
      } else if (data) {
        setOutlines(data as OutlineItem[]);
      }
      setLoading(false);
    }

    load();
    return () => {
      ignore = true;
    };
  }, [debouncedSearch, supabase, refreshKey]);

  const handleDuplicate = async (outline: OutlineItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const { data: fullOutline, error: fetchError } = await supabase
      .from("outlines")
      .select("*")
      .eq("id", outline.id)
      .single();

    if (fetchError || !fullOutline) {
      toast.error("Erro ao carregar dados do esboço para duplicar.");
      return;
    }

    const { error: insertError } = await supabase.from("outlines").insert({
      user_id: userId,
      title: `${fullOutline.title} (Cópia)`,
      category: fullOutline.category,
      content: fullOutline.content,
      word_count: fullOutline.word_count ?? 0,
    });

    if (insertError) {
      toast.error("Erro ao duplicar esboço.");
    } else {
      toast.success("Esboço duplicado com sucesso.");
      setRefreshKey((k) => k + 1);
    }
  };

  const confirmDelete = async () => {
    if (!outlineToDelete) return;
    setIsDeleting(true);

    const { error } = await supabase
      .from("outlines")
      .delete()
      .eq("id", outlineToDelete.id);

    setIsDeleting(false);

    if (error) {
      toast.error("Erro ao excluir esboço.");
    } else {
      toast.success("Esboço excluído.");
      setOutlineToDelete(null);
      setRefreshKey((k) => k + 1);
    }
  };

  return (
    <div className="flex flex-col gap-5 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <div>
          <h1 className="font-display font-semibold text-2xl text-[var(--ink)]">
            Discursos
          </h1>
          <p className="text-body-sm text-[var(--ink-muted)]">
            Prepare, organize e consulte seus esboços
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/discursos/biblia"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "h-9 px-3 text-xs rounded-full shrink-0 text-[var(--ink-muted)] hover:text-[var(--ink)]"
            )}
            title="Buscar palavras e temas na Bíblia"
          >
            <Search size={14} className="mr-1" /> Bíblia
          </Link>

          <Link
            href="/discursos/novo"
            className={cn(
              buttonVariants({ variant: "primary", size: "sm" }),
              "h-9 px-4 text-sm rounded-full shrink-0"
            )}
          >
            <Plus size={16} className="-ml-1 mr-1" /> Novo
          </Link>
        </div>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-5 w-5 text-[var(--ink-muted)] pointer-events-none" />
        <Input
          placeholder="Buscar esboços por título..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-[var(--surface)] border-[var(--border)] shadow-sm"
        />
      </div>

      {/* Lista de esboços */}
      <div className="flex flex-col gap-3">
        {loading ? (
          <div className="flex flex-col gap-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 bg-[var(--surface)] border border-[var(--border)] rounded-2xl opacity-60"
              />
            ))}
          </div>
        ) : outlines.length === 0 ? (
          <div className="text-center py-12 flex flex-col items-center">
            <div className="w-16 h-16 bg-[var(--surface)] border border-[var(--border)] rounded-full flex items-center justify-center mb-4 text-[var(--ink-muted)]">
              <BookOpenText size={30} />
            </div>
            <h3 className="font-display font-semibold text-lg text-[var(--ink)] mb-1">
              Nenhum esboço encontrado
            </h3>
            <p className="text-body-sm text-[var(--ink-muted)] mb-6 max-w-xs">
              {search
                ? "Nenhum esboço corresponde aos termos pesquisados."
                : "Você ainda não preparou nenhum esboço. Crie o seu primeiro agora mesmo."}
            </p>
            {!search && (
              <Link
                href="/discursos/novo"
                className={buttonVariants({ variant: "secondary" })}
              >
                Criar meu primeiro esboço
              </Link>
            )}
          </div>
        ) : (
          outlines.map((outline) => {
            const minutes = minutesFromWords(outline.word_count || 0);

            return (
              <Link key={outline.id} href={`/discursos/${outline.id}`} className="block">
                <Card
                  interactive
                  padding="sm"
                  className="flex items-center gap-3.5 hover:border-[var(--primary)]/40 group transition-all"
                >
                  <div className="w-11 h-11 rounded-xl bg-[var(--background)] flex items-center justify-center text-[var(--primary)] shrink-0 border border-[var(--border)]">
                    <BookOpenText size={20} />
                  </div>

                  <div className="flex-1 min-w-0 py-0.5">
                    <h3 className="font-display font-medium text-[var(--ink)] truncate text-base mb-1">
                      {outline.title || "Sem título"}
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      {outline.category && (
                        <Badge variant="accent">{outline.category}</Badge>
                      )}
                      <span className="text-caption text-[var(--ink-muted)]">
                        {formatRelativeDate(outline.updated_at)}
                      </span>
                      {outline.word_count > 0 && (
                        <span className="text-caption text-[var(--ink-muted)] tabular-nums">
                          · {formatDuration(minutes)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        router.push(`/discursos/${outline.id}/apresentar`);
                      }}
                      title="Apresentar no Modo Discurso"
                      aria-label="Apresentar esboço"
                      className="p-2 rounded-lg text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors cursor-pointer"
                    >
                      <Play size={15} fill="currentColor" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDuplicate(outline, e)}
                      title="Duplicar esboço"
                      aria-label="Duplicar esboço"
                      className="p-2 rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--background)] transition-colors cursor-pointer"
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setOutlineToDelete(outline);
                      }}
                      title="Excluir esboço"
                      aria-label="Excluir esboço"
                      className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </Card>
              </Link>
            );
          })
        )}
      </div>

      {/* Diálogo de confirmação de exclusão */}
      <DeleteOutlineDialog
        open={!!outlineToDelete}
        onOpenChange={(open) => {
          if (!open) setOutlineToDelete(null);
        }}
        outlineTitle={outlineToDelete?.title}
        onConfirm={confirmDelete}
        loading={isDeleting}
      />
    </div>
  );
}
