"use client";

import { useEffect, useState, useCallback } from "react";
import { getDb, type DailyRecord, type Contact, type VisitHistory } from "./dexie";
import { createClient } from "@/lib/supabase/client";
import type { SyncQueueItem } from "./dexie";

// ─────────────────────────────────────────────────────────────
// hydrateTable — shared utility for safe Supabase → Dexie sync
//
// Merges remote data into a Dexie table without overwriting
// records that are still pending in the sync queue.
// Used by every hook that hydrates from Supabase.
// ─────────────────────────────────────────────────────────────

type HydrateTableArgs<T extends { id: string }> = {
  tableName: SyncQueueItem["table_name"];
  remoteData: T[];
  // Function that returns all local records to compare against remote
  getLocalRecords: () => Promise<{ id: string }[]>;
  // Function to perform the actual Dexie transaction
  applyChanges: (toDeleteIds: string[], safeData: T[]) => Promise<void>;
};

async function hydrateTable<T extends { id: string }>({
  tableName,
  remoteData,
  getLocalRecords,
  applyChanges,
}: HydrateTableArgs<T>): Promise<void> {
  const db = getDb();

  // Get all record IDs currently pending in the sync queue for this table.
  // These must NOT be overwritten — they contain local changes not yet sent to Supabase.
  const pendingQueue = await db.sync_queue
    .where("table_name")
    .equals(tableName)
    .toArray();
  const pendingIds = new Set(pendingQueue.map((q) => q.record_id));

  const remoteIds = new Set(remoteData.map((d) => d.id));
  const localRecords = await getLocalRecords();

  // Records in Dexie that are no longer in Supabase AND not pending sync = safe to delete
  const toDeleteIds = localRecords
    .filter((l) => !remoteIds.has(l.id) && !pendingIds.has(l.id))
    .map((l) => l.id);

  // Remote records that don't have a pending local change = safe to overwrite
  const safeData = remoteData.filter((d) => !pendingIds.has(d.id));

  await applyChanges(toDeleteIds, safeData);
}

// ─────────────────────────────────────────────────────────────
// useDashboardData — single hook for the Dashboard screen
//
// Replaces useMonthRecords + useDailyRecords + useContacts.
// Reads everything from Dexie in parallel (1 render),
// then hydrates from Supabase in parallel (1 render).
// Total: 2 renders instead of up to 6.
// ─────────────────────────────────────────────────────────────

export function useDashboardData(userId: string | undefined) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const monthStr = `${y}-${String(m).padStart(2, "0")}`;

  const [state, setState] = useState({
    totalMinutes: 0,
    contacts: [] as Contact[],
    loading: true,
  });

  const refresh = useCallback(async () => {
    if (!userId) return;
    const db = getDb();

    // ── Phase 1: read Dexie in parallel → 1 render ───────────
    const [allRecords, contacts] = await Promise.all([
      db.daily_records
        .where("user_id")
        .equals(userId)
        .filter((r) => r.date.startsWith(monthStr))
        .toArray(),
      db.contacts.where("user_id").equals(userId).sortBy("name"),
    ]);

    setState({
      totalMinutes: allRecords.reduce((s, r) => s + r.duration_minutes, 0),
      contacts,
      loading: false,
    });

    // ── Phase 2: hydrate from Supabase in parallel → 1 render ─
    try {
      const supabase = createClient();

      const [{ data: remoteRecords }, { data: remoteContacts }] = await Promise.all([
        supabase
          .from("daily_records")
          .select("*")
          .eq("user_id", userId)
          .order("date", { ascending: false }),
        supabase
          .from("contacts")
          .select("*")
          .eq("user_id", userId)
          .order("name"),
      ]);

      // Hydrate both tables in a single coordinated transaction
      await Promise.all([
        remoteRecords
          ? hydrateTable<DailyRecord>({
              tableName: "daily_records",
              remoteData: remoteRecords as DailyRecord[],
              getLocalRecords: () =>
                db.daily_records.where("user_id").equals(userId).toArray(),
              applyChanges: async (toDeleteIds, safeData) => {
                await db.transaction("rw", db.daily_records, async () => {
                  if (toDeleteIds.length > 0)
                    await db.daily_records.bulkDelete(toDeleteIds);
                  if (safeData.length > 0)
                    await db.daily_records.bulkPut(
                      safeData.map((r) => ({ ...r, synced: true }))
                    );
                });
              },
            })
          : Promise.resolve(),
        remoteContacts
          ? hydrateTable<Contact>({
              tableName: "contacts",
              remoteData: remoteContacts as Contact[],
              getLocalRecords: () =>
                db.contacts.where("user_id").equals(userId).toArray(),
              applyChanges: async (toDeleteIds, safeData) => {
                await db.transaction("rw", db.contacts, async () => {
                  if (toDeleteIds.length > 0)
                    await db.contacts.bulkDelete(toDeleteIds);
                  if (safeData.length > 0)
                    await db.contacts.bulkPut(
                      safeData.map((c) => ({ ...c, synced: true }))
                    );
                });
              },
            })
          : Promise.resolve(),
      ]);

      // Final read after hydration → 1 setState for both
      const [freshRecords, freshContacts] = await Promise.all([
        db.daily_records
          .where("user_id")
          .equals(userId)
          .filter((r) => r.date.startsWith(monthStr))
          .toArray(),
        db.contacts.where("user_id").equals(userId).sortBy("name"),
      ]);

      setState({
        totalMinutes: freshRecords.reduce((s, r) => s + r.duration_minutes, 0),
        contacts: freshContacts,
        loading: false,
      });
    } catch {
      // Offline — local data from Phase 1 already set
    }
  }, [userId, monthStr]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { ...state, refresh };
}

// ─────────────────────────────────────────────────────────────
// useDailyRecords — used by Histórico screen
// ─────────────────────────────────────────────────────────────

export function useDailyRecords(userId: string | undefined) {
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const db = getDb();

    // Phase 1: local
    const local = await db.daily_records
      .where("user_id")
      .equals(userId)
      .sortBy("date");
    setRecords(local.reverse());

    // Phase 2: hydrate via shared utility
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("daily_records")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: false });

      if (data) {
        await hydrateTable<DailyRecord>({
          tableName: "daily_records",
          remoteData: data as DailyRecord[],
          getLocalRecords: () =>
            db.daily_records.where("user_id").equals(userId).toArray(),
          applyChanges: async (toDeleteIds, safeData) => {
            await db.transaction("rw", db.daily_records, async () => {
              if (toDeleteIds.length > 0)
                await db.daily_records.bulkDelete(toDeleteIds);
              if (safeData.length > 0)
                await db.daily_records.bulkPut(
                  safeData.map((r) => ({ ...r, synced: true }))
                );
            });
          },
        });

        setRecords(
          (
            await db.daily_records
              .where("user_id")
              .equals(userId)
              .sortBy("date")
          ).reverse()
        );
      }
    } catch {
      // Offline — keep local data
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { records, loading, refresh };
}

// ─────────────────────────────────────────────────────────────
// useMonthRecords — used by Histórico (month selector)
// ─────────────────────────────────────────────────────────────

export function useMonthRecords(userId: string | undefined, year?: number, month?: number) {
  const now = new Date();
  const y = year ?? now.getFullYear();
  const m = month ?? now.getMonth() + 1;

  const [totalMinutes, setTotalMinutes] = useState(0);
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const db = getDb();
    const monthStr = `${y}-${String(m).padStart(2, "0")}`;

    const recs = await db.daily_records
      .where("user_id")
      .equals(userId)
      .filter((r) => r.date.startsWith(monthStr))
      .toArray();

    setRecords(recs);
    setTotalMinutes(recs.reduce((s, r) => s + r.duration_minutes, 0));
    setLoading(false);
  }, [userId, y, m]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { totalMinutes, records, loading, refresh };
}

// ─────────────────────────────────────────────────────────────
// useContacts — used by Contatos screen
// ─────────────────────────────────────────────────────────────

export function useContacts(userId: string | undefined) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const db = getDb();

    const local = await db.contacts.where("user_id").equals(userId).sortBy("name");
    setContacts(local);

    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("contacts")
        .select("*")
        .eq("user_id", userId)
        .order("name");

      if (data) {
        await hydrateTable<Contact>({
          tableName: "contacts",
          remoteData: data as Contact[],
          getLocalRecords: () =>
            db.contacts.where("user_id").equals(userId).toArray(),
          applyChanges: async (toDeleteIds, safeData) => {
            await db.transaction("rw", db.contacts, async () => {
              if (toDeleteIds.length > 0)
                await db.contacts.bulkDelete(toDeleteIds);
              if (safeData.length > 0)
                await db.contacts.bulkPut(
                  safeData.map((c) => ({ ...c, synced: true }))
                );
            });
          },
        });

        setContacts(
          await db.contacts.where("user_id").equals(userId).sortBy("name")
        );
      }
    } catch {
      // Offline
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { contacts, loading, refresh };
}

// ─────────────────────────────────────────────────────────────
// useContact (single) — used by contact detail screen
// ─────────────────────────────────────────────────────────────

export function useContact(contactId: string) {
  const [contact, setContact] = useState<Contact | null>(null);
  const [visits, setVisits] = useState<VisitHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!contactId) return;
    const db = getDb();

    const local = await db.contacts.get(contactId);
    if (local) setContact(local);

    const localVisits = await db.visit_history
      .where("contact_id")
      .equals(contactId)
      .sortBy("visit_date");
    setVisits(localVisits.reverse());

    try {
      const supabase = createClient();
      const { data: c } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", contactId)
        .single();

      if (c) {
        const pendingC = await db.sync_queue
          .where("record_id")
          .equals(contactId)
          .count();
        if (pendingC === 0) {
          await db.contacts.put({ ...c, synced: true });
          setContact({ ...c, synced: true });
        }
      }

      const { data: v } = await supabase
        .from("visit_history")
        .select("*")
        .eq("contact_id", contactId)
        .order("visit_date", { ascending: false });

      if (v) {
        await hydrateTable<VisitHistory>({
          tableName: "visit_history",
          remoteData: v as VisitHistory[],
          getLocalRecords: () =>
            db.visit_history.where("contact_id").equals(contactId).toArray(),
          applyChanges: async (toDeleteIds, safeData) => {
            await db.transaction("rw", db.visit_history, async () => {
              if (toDeleteIds.length > 0)
                await db.visit_history.bulkDelete(toDeleteIds);
              if (safeData.length > 0)
                await db.visit_history.bulkPut(
                  safeData.map((x) => ({ ...x, synced: true }))
                );
            });
          },
        });

        setVisits(
          (
            await db.visit_history
              .where("contact_id")
              .equals(contactId)
              .sortBy("visit_date")
          ).reverse()
        );
      }
    } catch {
      // Offline
    }
    setLoading(false);
  }, [contactId]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { contact, visits, loading, refresh };
}

// ─────────────────────────────────────────────────────────────
// useUpcomingVisits — agenda calendar widget
// ─────────────────────────────────────────────────────────────

export function useUpcomingVisits(userId: string | undefined, limit = 3) {
  const [upcoming, setUpcoming] = useState<
    (VisitHistory & { contact_name: string })[]
  >([]);

  useEffect(() => {
    if (!userId) return;
    const db = getDb();

    (async () => {
      const contacts = await db.contacts.where("user_id").equals(userId).toArray();
      const contactMap = new Map(contacts.map((c) => [c.id, c.name]));

      const visits = await db.visit_history
        .filter(
          (v) =>
            !!v.next_visit_date &&
            contactMap.has(v.contact_id)
        )
        .sortBy("next_visit_date");

      setUpcoming(
        visits.slice(0, limit).map((v) => ({
          ...v,
          contact_name: contactMap.get(v.contact_id) ?? "—",
        }))
      );
    })();
  }, [userId, limit]);

  return upcoming;
}

// ─────────────────────────────────────────────────────────────
// useAllVisits — for calendar
// ─────────────────────────────────────────────────────────────

export function useAllVisits(userId: string | undefined) {
  const [visits, setVisits] = useState<(VisitHistory & { contact_name: string })[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const db = getDb();

    const contacts = await db.contacts.where("user_id").equals(userId).toArray();
    const contactMap = new Map(contacts.map((c) => [c.id, c.name]));

    const allVisits = await db.visit_history
      .filter((v) => contactMap.has(v.contact_id))
      .toArray();

    setVisits(
      allVisits.map((v) => ({
        ...v,
        contact_name: contactMap.get(v.contact_id) ?? "—",
      }))
    );
    setLoading(false);
  }, [userId]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { visits, loading, refresh };
}
