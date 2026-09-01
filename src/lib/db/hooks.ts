"use client";

import { useEffect, useState, useCallback } from "react";
import { getDb, type DailyRecord, type Contact, type VisitHistory } from "./dexie";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";

// ─────────────────────────────────────────────────────────────
// useDailyRecords — read from Dexie, hydrate from Supabase
// ─────────────────────────────────────────────────────────────

export function useDailyRecords(userId: string | undefined) {
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const db = getDb();

    // Always read from local first
    const local = await db.daily_records
      .where("user_id")
      .equals(userId)
      .sortBy("date");
    setRecords(local.reverse());

    // Hydrate from Supabase in background
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("daily_records")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: false });

      if (data) {
        const pendingQueue = await db.sync_queue.where("table_name").equals("daily_records").toArray();
        const pendingIds = new Set(pendingQueue.map(q => q.record_id));
        
        const localRecords = await db.daily_records.where("user_id").equals(userId).toArray();
        const remoteIds = new Set(data.map(d => d.id));
        
        const toDeleteIds = localRecords
          .filter(l => !remoteIds.has(l.id) && !pendingIds.has(l.id))
          .map(l => l.id);
          
        const safeData = data.filter(d => !pendingIds.has(d.id));

        await db.transaction("rw", db.daily_records, async () => {
          if (toDeleteIds.length > 0) {
            await db.daily_records.bulkDelete(toDeleteIds);
          }
          if (safeData.length > 0) {
            await db.daily_records.bulkPut(safeData.map(r => ({ ...r, synced: true })));
          }
        });

        setRecords(
          (await db.daily_records
            .where("user_id")
            .equals(userId)
            .sortBy("date")).reverse()
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
// useMonthRecords — current month aggregates
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
// useContacts
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
        const pendingQueue = await db.sync_queue.where("table_name").equals("contacts").toArray();
        const pendingIds = new Set(pendingQueue.map(q => q.record_id));
        
        const localRecords = await db.contacts.where("user_id").equals(userId).toArray();
        const remoteIds = new Set(data.map(d => d.id));
        
        const toDeleteIds = localRecords
          .filter(l => !remoteIds.has(l.id) && !pendingIds.has(l.id))
          .map(l => l.id);
          
        const safeData = data.filter(d => !pendingIds.has(d.id));

        await db.transaction("rw", db.contacts, async () => {
          if (toDeleteIds.length > 0) {
            await db.contacts.bulkDelete(toDeleteIds);
          }
          if (safeData.length > 0) {
            await db.contacts.bulkPut(safeData.map(c => ({ ...c, synced: true })));
          }
        });

        setContacts(await db.contacts.where("user_id").equals(userId).sortBy("name"));
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
// useContact (single)
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
        const pendingC = await db.sync_queue.where("record_id").equals(contactId).count();
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
        const pendingQueue = await db.sync_queue.where("table_name").equals("visit_history").toArray();
        const pendingIds = new Set(pendingQueue.map(q => q.record_id));
        
        const localRecords = await db.visit_history.where("contact_id").equals(contactId).toArray();
        const remoteIds = new Set(v.map(d => d.id));
        
        const toDeleteIds = localRecords
          .filter(l => !remoteIds.has(l.id) && !pendingIds.has(l.id))
          .map(l => l.id);
          
        const safeData = v.filter(d => !pendingIds.has(d.id));

        await db.transaction("rw", db.visit_history, async () => {
          if (toDeleteIds.length > 0) {
            await db.visit_history.bulkDelete(toDeleteIds);
          }
          if (safeData.length > 0) {
            await db.visit_history.bulkPut(safeData.map(x => ({ ...x, synced: true })));
          }
        });

        setVisits(
          (await db.visit_history
            .where("contact_id")
            .equals(contactId)
            .sortBy("visit_date")).reverse()
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
// useUpcomingVisits — for dashboard widget
// ─────────────────────────────────────────────────────────────

export function useUpcomingVisits(userId: string | undefined, limit = 3) {
  const [upcoming, setUpcoming] = useState<
    (VisitHistory & { contact_name: string })[]
  >([]);

  useEffect(() => {
    if (!userId) return;
    const db = getDb();

    (async () => {
      // Get contacts for this user first
      const contacts = await db.contacts.where("user_id").equals(userId).toArray();
      const contactMap = new Map(contacts.map((c) => [c.id, c.name]));

      // Get visits with a next_visit_date set, order soonest first
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
