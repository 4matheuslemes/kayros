import { getDb, type SyncQueueItem } from "./dexie";
import { createClient } from "@/lib/supabase/client";

/**
 * Flushes pending items from the sync queue to Supabase.
 * Called when the browser comes back online.
 */
export async function flushSyncQueue(): Promise<void> {
  const db = getDb();
  const supabase = createClient();

  const pending = await db.sync_queue.orderBy("created_at").toArray();
  if (pending.length === 0) return;

  for (const item of pending) {
    try {
      await processSyncItem(supabase, item);
      await db.sync_queue.delete(item.id!);
    } catch (err) {
      // Increment attempt counter — give up after 5 failures
      if (item.attempts >= 4) {
        console.error("[sync] Giving up on item after 5 attempts:", item, err);
        await db.sync_queue.delete(item.id!);
      } else {
        await db.sync_queue.update(item.id!, { attempts: item.attempts + 1 });
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
      const { error } = await supabase
        .from(table_name)
        .upsert(payload as Record<string, unknown>);
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

/**
 * Enqueues a write operation for later sync.
 * Always call this after writing to Dexie locally.
 */
export async function enqueueSync(
  table_name: SyncQueueItem["table_name"],
  record_id: string,
  operation: SyncQueueItem["operation"],
  payload: Record<string, unknown>
): Promise<void> {
  const db = getDb();
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
