import Dexie, { type Table } from "dexie";
import type { ActivityCategory, ActivitySource, ContactStatus } from "@/lib/constants";

// ─────────────────────────────────────────────────────────────
// Domain types (mirrors Supabase schema)
// ─────────────────────────────────────────────────────────────

export interface DailyRecord {
  id: string;
  user_id: string;
  date: string; // ISO date "YYYY-MM-DD"
  duration_minutes: number;
  category: ActivityCategory;
  source: ActivitySource;
  notes?: string;
  created_at: string;
  updated_at: string;
  synced: boolean;
}

export interface Contact {
  id: string;
  user_id: string;
  name: string;
  address?: string;
  phone?: string;
  interests?: string;
  status: ContactStatus;
  created_at: string;
  updated_at: string;
  synced: boolean;
}

export interface VisitHistory {
  id: string;
  contact_id: string;
  visit_date: string; // ISO date
  notes?: string;
  next_visit_date?: string; // ISO date, nullable
  created_at: string;
  updated_at: string;
  synced: boolean;
}

export interface Profile {
  id: string;
  full_name: string;
  congregation_name?: string;
  monthly_goal_hours: number;
  service_year_start_month: number;
}

export type SyncOperation = "INSERT" | "UPDATE" | "DELETE";

export interface SyncQueueItem {
  id?: number; // auto-increment Dexie key
  table_name: "daily_records" | "contacts" | "visit_history";
  record_id: string;
  operation: SyncOperation;
  payload: Record<string, unknown>;
  created_at: string;
  attempts: number;
}

// ─────────────────────────────────────────────────────────────
// Dexie database class
// ─────────────────────────────────────────────────────────────

class KairosDB extends Dexie {
  daily_records!: Table<DailyRecord>;
  contacts!:       Table<Contact>;
  visit_history!:  Table<VisitHistory>;
  profiles!:       Table<Profile>;
  sync_queue!:     Table<SyncQueueItem>;

  constructor() {
    super("kairos_db");

    this.version(1).stores({
      daily_records: "id, user_id, date, category, synced",
      contacts:      "id, user_id, name, status, synced",
      visit_history: "id, contact_id, visit_date, next_visit_date, synced",
      profiles:      "id",
      sync_queue:    "++id, table_name, record_id, operation, created_at",
    });
  }
}

// Singleton
let _db: KairosDB | null = null;

export function getDb(): KairosDB {
  if (typeof window === "undefined") {
    throw new Error("Dexie must only be accessed on the client side.");
  }
  if (!_db) {
    _db = new KairosDB();
  }
  return _db;
}
