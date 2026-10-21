"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Plus, CalendarDays, X, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Presentation {
  id: string;
  date: string; // "YYYY-MM-DD"
  occasion: string | null;
  created_at: string;
}

interface PresentationHistoryProps {
  outlineId: string;
}

function formatDate(dateStr: string): string {
  // dateStr: "YYYY-MM-DD" — parse sem deslocamento de fuso
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function PresentationHistory({ outlineId }: PresentationHistoryProps) {
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0]; // "YYYY-MM-DD"
  });
  const [occasion, setOccasion] = useState("");
  const [saving, setSaving] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  const fetchPresentations = useCallback(async () => {
    const { data, error } = await supabase
      .from("outline_presentations")
      .select("id, date, occasion, created_at")
      .eq("outline_id", outlineId)
      .order("date", { ascending: false });

    if (!error && data) {
      setPresentations(data);
    }
    setLoading(false);
  }, [outlineId, supabase]);

  useEffect(() => {
    fetchPresentations();
  }, [fetchPresentations]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return;

    setSaving(true);

    const { error } = await supabase
      .from("outline_presentations")
      .insert({
        outline_id: outlineId,
        date,
        occasion: occasion.trim() || null,
      });

    if (error) {
      toast.error("Erro ao registrar apresentação.");
    } else {
      toast.success("Apresentação registrada.");
      setShowForm(false);
      setOccasion("");
      fetchPresentations();
    }

    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("outline_presentations")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao remover apresentação.");
    } else {
      setPresentations((prev) => prev.filter((p) => p.id !== id));
      toast.success("Registro removido.");
    }
  };

  return (
    <div className="presentation-history mt-8 pt-6 border-t border-[var(--border)]">
      {/* ── CABEÇALHO ─────────────────────────────── */}
      <div className="presentation-history-header flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <CalendarDays size={16} className="text-[var(--ink-muted)]" />
          <span className="text-sm font-semibold text-[var(--ink)]">
            Histórico de apresentações
          </span>
          {presentations.length > 0 && (
            <span className="presentation-count text-xs px-2 py-0.5 rounded-full bg-[var(--background)] border border-[var(--border)] text-[var(--ink-muted)] font-medium">
              {presentations.length}
            </span>
          )}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowForm((v) => !v)}
          className="h-8 px-2.5 text-xs text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-full"
        >
          {showForm ? (
            "Cancelar"
          ) : (
            <>
              <Plus size={13} className="mr-1" />
              Marcar como apresentado
            </>
          )}
        </Button>
      </div>

      {/* ── FORMULÁRIO ────────────────────────────── */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="presentation-form bg-[var(--surface)] p-3.5 rounded-xl border border-[var(--border)] shadow-xs mb-4 flex flex-col gap-3"
        >
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="presentation-date"
                className="text-xs font-medium text-[var(--ink-muted)]"
              >
                Data
              </label>
              <input
                id="presentation-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="presentation-form-input text-xs h-8 px-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--ink)] focus:outline-none focus:border-[var(--primary)]"
              />
            </div>

            <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
              <label
                htmlFor="presentation-occasion"
                className="text-xs font-medium text-[var(--ink-muted)]"
              >
                Ocasião (opcional)
              </label>
              <input
                id="presentation-occasion"
                type="text"
                value={occasion}
                onChange={(e) => setOccasion(e.target.value)}
                placeholder="Ex: Salão do Reino Central, Assembleia, etc."
                maxLength={150}
                className="presentation-form-input text-xs h-8 px-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--ink)] focus:outline-none focus:border-[var(--primary)]"
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={saving || !date}
            className="h-8 text-xs self-start"
          >
            {saving ? (
              <Loader2 size={13} className="animate-spin mr-1.5" />
            ) : null}
            Salvar apresentação
          </Button>
        </form>
      )}

      {/* ── LISTA ─────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center gap-2 text-[var(--ink-muted)] text-xs py-2">
          <Loader2 size={13} className="animate-spin" />
          Carregando histórico...
        </div>
      ) : presentations.length === 0 ? (
        <p className="text-xs text-[var(--ink-muted)] py-1">
          Nenhuma apresentação registrada ainda para este esboço.
        </p>
      ) : (
        <ul className="presentation-list flex flex-col gap-1.5">
          {presentations.map((p) => (
            <li
              key={p.id}
              className="presentation-item flex items-center justify-between gap-2 p-2 rounded-lg bg-[var(--surface)] border border-[var(--border)]/60 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <CalendarDays
                  size={13}
                  className="text-[var(--ink-muted)] shrink-0"
                />
                <span className="presentation-date font-medium text-[var(--ink)]">
                  {formatDate(p.date)}
                </span>
                {p.occasion && (
                  <>
                    <span className="text-[var(--ink-muted)]">—</span>
                    <span className="presentation-occasion text-[var(--ink-muted)] truncate">
                      {p.occasion}
                    </span>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleDelete(p.id)}
                className="presentation-delete p-1 rounded-md text-[var(--ink-muted)] hover:text-red-600 hover:bg-red-500/10 transition-colors"
                title="Remover registro"
                aria-label="Remover apresentação"
              >
                <X size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
