"use client";

import { useEffect, useState, useCallback } from "react";
import { Cloud, CloudOff, CloudAlert } from "lucide-react";
import { getDb, type SyncQueueItem, type SyncError, type SyncErrorReason } from "@/lib/db/dexie";
import { Drawer } from "@/components/ui/drawer";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─────────────────────────────────────────────────────────────
// Human-readable labels for sync error reasons
// ─────────────────────────────────────────────────────────────

const ERROR_LABELS: Record<SyncErrorReason, string> = {
  rls_violation:     "Sem permissão para salvar este registro",
  schema_mismatch:   "Formato de dado incompatível com o servidor",
  not_found:         "Registro não encontrado no servidor",
  conflict:          "Conflito com outro registro existente",
  network_exhausted: "Falha de rede persistente — sem conexão estável",
  unknown_permanent: "Erro desconhecido",
};

const TABLE_LABELS: Record<string, string> = {
  daily_records: "Registro de horas",
  contacts:      "Contato",
  visit_history: "Visita/Retorno",
};

// ─────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────

type SyncState = "ok" | "pending" | "error";

interface SyncStatus {
  state: SyncState;
  pendingCount: number;
  errorCount: number;
  pendingItems: SyncQueueItem[];
  errorItems: SyncError[];
}

const EMPTY: SyncStatus = {
  state: "ok",
  pendingCount: 0,
  errorCount: 0,
  pendingItems: [],
  errorItems: [],
};

// ─────────────────────────────────────────────────────────────
// Hook — polls Dexie every few seconds to stay current
// ─────────────────────────────────────────────────────────────

function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>(EMPTY);

  const read = useCallback(async () => {
    if (typeof window === "undefined") return;
    try {
      const db = getDb();
      const [pendingItems, errorItems] = await Promise.all([
        db.sync_queue.orderBy("created_at").toArray(),
        db.sync_errors.orderBy("failed_at").reverse().toArray(),
      ]);

      const pendingCount = pendingItems.length;
      const errorCount   = errorItems.length;
      const state: SyncState =
        errorCount > 0   ? "error"   :
        pendingCount > 0 ? "pending" : "ok";

      setStatus({ state, pendingCount, errorCount, pendingItems, errorItems });
    } catch {
      // DB not ready yet — stay in "ok" state
    }
  }, []);

  useEffect(() => {
    void read();

    // Only poll while the document is visible.
    // If the user backgrounds the app or switches browser tabs, pause the
    // interval and resume as soon as the tab becomes visible again.
    let id: ReturnType<typeof setInterval> | null = null;

    function startPolling() {
      id = setInterval(() => void read(), 5000);
    }
    function stopPolling() {
      if (id !== null) {
        clearInterval(id);
        id = null;
      }
    }
    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        void read(); // immediate refresh on resume
        startPolling();
      } else {
        stopPolling();
      }
    }

    if (document.visibilityState === "visible") {
      startPolling();
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [read]);

  return status;
}

// ─────────────────────────────────────────────────────────────
// SyncStatusIndicator — main export
// ─────────────────────────────────────────────────────────────

export function SyncStatusIndicator() {
  const status = useSyncStatus();
  const [open, setOpen] = useState(false);

  // Only show the indicator if there is something to report
  const hasActivity = status.state !== "ok";

  const IconEl =
    status.state === "error"   ? CloudAlert :
    status.state === "pending" ? CloudOff   : Cloud;

  const iconColor =
    status.state === "error"   ? "text-[var(--error,#c0392b)]" :
    status.state === "pending" ? "text-[var(--accent)]"        : "text-[var(--ink-muted)]";

  const badgeCount =
    status.state === "error"   ? status.errorCount   :
    status.state === "pending" ? status.pendingCount : 0;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`relative p-2 rounded-full transition-all duration-200 ${
          hasActivity
            ? "hover:bg-[var(--background)]"
            : "opacity-40 hover:opacity-70 hover:bg-[var(--background)]"
        }`}
        aria-label={
          status.state === "error"   ? `${status.errorCount} erros de sincronização` :
          status.state === "pending" ? `${status.pendingCount} alterações pendentes` :
          "Sincronizado"
        }
      >
        <IconEl size={18} className={`${iconColor} transition-colors duration-300`} />

        {/* Badge */}
        {badgeCount > 0 && (
          <span
            className={`absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center leading-none ${
              status.state === "error"
                ? "bg-[var(--error,#c0392b)]"
                : "bg-[var(--accent)]"
            }`}
          >
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        )}
      </button>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Status de sincronização"
        description={
          status.state === "ok"
            ? "Todas as alterações foram salvas no servidor."
            : undefined
        }
      >
        {/* ── OK state ── */}
        {status.state === "ok" && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Cloud size={40} className="text-[var(--ink-muted)] opacity-40" />
            <p className="text-body text-[var(--ink-muted)]">
              Tudo sincronizado
            </p>
          </div>
        )}

        {/* ── Pending items ── */}
        {status.pendingItems.length > 0 && (
          <section className="mb-6">
            <h3 className="text-subheading text-[var(--ink)] mb-3 flex items-center gap-2">
              <CloudOff size={16} className="text-[var(--accent)]" />
              Aguardando envio
              <span className="ml-auto text-caption text-[var(--ink-muted)]">
                {status.pendingItems.length} {status.pendingItems.length === 1 ? "item" : "itens"}
              </span>
            </h3>
            <ul className="flex flex-col gap-2">
              {status.pendingItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-[var(--background)] border border-[var(--border)]"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm font-medium text-[var(--ink)] truncate">
                      {TABLE_LABELS[item.table_name] ?? item.table_name}
                    </p>
                    <p className="text-caption text-[var(--ink-muted)] mt-0.5">
                      {item.operation === "DELETE" ? "Exclusão" : item.operation === "INSERT" ? "Criação" : "Atualização"}
                      {" · "}
                      {item.attempts > 0 ? `${item.attempts} tentativa${item.attempts > 1 ? "s" : ""} feita${item.attempts > 1 ? "s" : ""}` : "Aguardando conexão"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Error items ── */}
        {status.errorItems.length > 0 && (
          <section>
            <h3 className="text-subheading text-[var(--ink)] mb-3 flex items-center gap-2">
              <CloudAlert size={16} className="text-[var(--error,#c0392b)]" />
              Não foi possível salvar
              <span className="ml-auto text-caption text-[var(--ink-muted)]">
                {status.errorItems.length} {status.errorItems.length === 1 ? "item" : "itens"}
              </span>
            </h3>
            <ul className="flex flex-col gap-2">
              {status.errorItems.map((err) => (
                <li
                  key={err.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-[var(--error,#c0392b)]/5 border border-[var(--error,#c0392b)]/20"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm font-medium text-[var(--ink)] truncate">
                      {TABLE_LABELS[err.original_item.table_name] ?? err.original_item.table_name}
                    </p>
                    <p className="text-caption text-[var(--ink-muted)] mt-0.5">
                      {ERROR_LABELS[err.reason]}
                    </p>
                    <p className="text-caption text-[var(--ink-muted)] mt-0.5 opacity-60">
                      {format(parseISO(err.failed_at), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-caption text-[var(--ink-muted)] mt-4 leading-relaxed">
              Esses registros estão salvos localmente no seu dispositivo, mas não chegaram ao servidor. Entre em contato com o suporte se o problema persistir.
            </p>
          </section>
        )}
      </Drawer>
    </>
  );
}
