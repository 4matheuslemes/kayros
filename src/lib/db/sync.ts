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
