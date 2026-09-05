import { getDb, type SyncQueueItem, type SyncError, type SyncErrorReason } from "./dexie";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────────
// classifySupabaseError
//
// Determines whether an error from Supabase is recoverable
// (network timeout, 5xx server error) or permanent (4xx).
//
// Recoverable → retry up to MAX_ATTEMPTS, then give up.
// Permanent   → move to sync_errors immediately, never retry.
// ─────────────────────────────────────────────────────────────

type Classification =
  | { recoverable: true }
  | { recoverable: false; reason: SyncErrorReason; httpStatus?: number };

function classifySupabaseError(err: unknown): Classification {
  // Network/fetch failures — recoverable (offline, DNS, timeout)
  if (err instanceof TypeError && err.message.toLowerCase().includes("fetch")) {
    return { recoverable: true };
  }

  // Supabase client errors have a `status` or `code` property
  const e = err as Record<string, unknown>;
  const status = typeof e?.status === "number" ? e.status : undefined;
  const code = typeof e?.code === "string" ? e.code : "";

  if (status !== undefined) {
    if (status >= 500) return { recoverable: true }; // Server errors — retry
    if (status === 429) return { recoverable: true }; // Rate limit — retry

    if (status === 403) return { recoverable: false, reason: "rls_violation", httpStatus: status };
    if (status === 404) return { recoverable: false, reason: "not_found", httpStatus: status };
    if (status === 409) return { recoverable: false, reason: "conflict", httpStatus: status };
    if (status === 400 || status === 422) return { recoverable: false, reason: "schema_mismatch", httpStatus: status };

    // Other 4xx
    if (status >= 400 && status < 500) {
      return { recoverable: false, reason: "unknown_permanent", httpStatus: status };
    }
  }

  // PostgREST error codes (string codes like "23503", "42703")
  if (code === "23503" || code === "23505") return { recoverable: false, reason: "conflict" };
  if (code === "42703" || code === "42P01") return { recoverable: false, reason: "schema_mismatch" };
  if (code === "42501") return { recoverable: false, reason: "rls_violation" };

  // Anything else is assumed recoverable
  return { recoverable: true };
}

// ─────────────────────────────────────────────────────────────
// moveToPermanentErrors
//
// Writes the failed item to sync_errors (audit trail) and
// removes it from sync_queue, then shows a toast to the user.
// ─────────────────────────────────────────────────────────────

async function moveToPermanentErrors(
  item: SyncQueueItem,
  classification: { recoverable: false; reason: SyncErrorReason; httpStatus?: number },
  err: unknown
): Promise<void> {
  const db = getDb();

  const errorRecord: SyncError = {
    original_item: item,
    reason: classification.reason,
    http_status: classification.httpStatus,
    error_message: err instanceof Error ? err.message : String(err),
    failed_at: new Date().toISOString(),
  };

  await db.sync_errors.add(errorRecord);
  await db.sync_queue.delete(item.id!);

  console.error("[sync] Permanent error — moved to sync_errors:", errorRecord);

  // Inform the user — data did not reach the server
  toast.error("Um registro não pôde ser sincronizado", {
    description: "Os dados foram salvos localmente, mas não chegaram ao servidor. Verifique sua conexão e entre em contato com o suporte se o problema persistir.",
    duration: 8000,
  });
}

// ─────────────────────────────────────────────────────────────
// flushSyncQueue
//
// Flushes pending items from the sync queue to Supabase.
// Called when the browser comes back online.
//
// Changes vs. original:
//   1. Renews the Supabase session before processing to avoid
//      expired JWT causing every item to fail with 401.
//   2. Classifies errors as recoverable vs. permanent.
//      Permanent errors go to sync_errors, not the retry loop.
//   3. Shows a toast when data is permanently discarded.
// ─────────────────────────────────────────────────────────────

const MAX_ATTEMPTS = 5;

export async function flushSyncQueue(): Promise<void> {
  const db = getDb();
  const supabase = createClient();

  // ── Fix 1: Renew session before processing ────────────────
  // If the JWT expired while the user was offline (tokens last 1h),
  // every sync attempt would fail with 401/403. Refreshing here
  // ensures we have a valid token before touching the queue.
  try {
    await supabase.auth.getSession();
  } catch {
    // If session refresh fails, we're likely offline — abort
    return;
  }

  const pending = await db.sync_queue.orderBy("created_at").toArray();
  if (pending.length === 0) return;

  for (const item of pending) {
    try {
      await processSyncItem(supabase, item);
      await db.sync_queue.delete(item.id!);
    } catch (err) {
      // ── Fix 2: Classify the error ─────────────────────────
      const classification = classifySupabaseError(err);

      if (!classification.recoverable) {
        // ── Fix 3: Permanent errors → audit table + toast ───
        await moveToPermanentErrors(item, classification, err);
      } else {
        // Recoverable — increment counter and retry next time
        if (item.attempts >= MAX_ATTEMPTS - 1) {
          // Exhausted retries for a recoverable error too — give up
          // with a toast so the user knows, but keep in audit trail
          await moveToPermanentErrors(
            item,
            { recoverable: false, reason: "network_exhausted" },
            err
          );
        } else {
          await db.sync_queue.update(item.id!, { attempts: item.attempts + 1 });
        }
      }
    }
  }
}

async function processSyncItem(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: ReturnType<typeof createClient>,
  item: SyncQueueItem
): Promise<void> {
  const { table_name, operation, payload, record_id } = item;

  switch (operation) {
    case "INSERT":
    case "UPDATE": {
      const cleanPayload = { ...payload } as Record<string, unknown>;
      delete cleanPayload.synced; // Remove client-only flag before sending to Supabase

      const { error } = await supabase
        .from(table_name)
        .upsert(cleanPayload);
      if (error) throw error;
      break;
    }
    case "DELETE": {
      const { error } = await supabase
        .from(table_name)
        .delete()
        .eq("id", record_id);
      if (error) throw error;
      break;
    }
  }
}

// ─────────────────────────────────────────────────────────────
// enqueueSync
//
// Enqueues a write operation for later sync.
// Always call this after writing to Dexie locally.
// ─────────────────────────────────────────────────────────────

export async function enqueueSync(
  table_name: SyncQueueItem["table_name"],
  record_id: string,
  operation: SyncQueueItem["operation"],
  payload: Record<string, unknown>
): Promise<void> {
  const db = getDb();

  // Find existing queue items for this record
  const existing = await db.sync_queue
    .where("record_id")
    .equals(record_id)
    .toArray();

  const pendingInsert = existing.find(e => e.operation === "INSERT");

  if (operation === "DELETE") {
    if (pendingInsert) {
      // If we're deleting a record that was never synced to the cloud,
      // we just need to remove all pending operations for it from the queue,
      // and not enqueue a DELETE (because the cloud doesn't know about it).
      await db.sync_queue.where("record_id").equals(record_id).delete();
      return;
    }
  }

  if (operation === "UPDATE") {
    if (pendingInsert) {
      // If we're updating a record that was never synced,
      // update the payload of the pending INSERT and don't enqueue an UPDATE.
      await db.sync_queue.update(pendingInsert.id!, {
        payload: { ...pendingInsert.payload, ...payload } as Record<string, unknown>
      });
      return;
    }

    const pendingUpdate = existing.find(e => e.operation === "UPDATE");
    if (pendingUpdate) {
      // If there is already a pending UPDATE, merge into it instead of creating another UPDATE
      await db.sync_queue.update(pendingUpdate.id!, {
        payload: { ...pendingUpdate.payload, ...payload } as Record<string, unknown>
      });
      return;
    }
  }

  // Otherwise, add a new operation
  await db.sync_queue.add({
    table_name,
    record_id,
    operation,
    payload,
    created_at: new Date().toISOString(),
    attempts: 0,
  });

  // If online, flush immediately
  if (typeof window !== "undefined" && navigator.onLine) {
    void flushSyncQueue();
  }
}
