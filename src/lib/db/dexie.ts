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
  study_book_id?: string;
  study_current_unit_id?: string;
  study_frequency?: number;
  study_days?: number[];
  study_time?: string; // "HH:MM"
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
  next_visit_time?: string; // "HH:MM", nullable
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
  working_days?: number[];
  onboarding_completed: boolean;
  meeting_link?: string;
  is_admin?: boolean;
  weekly_schedule?: Record<string, number>;
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
// SyncError — records permanently failed sync operations.
// Non-recoverable errors (4xx, schema mismatches, RLS violations)
// are moved here instead of being silently discarded.
// Client-side only (not mirrored in Supabase).
// ─────────────────────────────────────────────────────────────

export type SyncErrorReason =
  | "rls_violation"       // 403 — RLS policy rejected the write
  | "schema_mismatch"     // 400/422 — payload columns don't match DB schema
  | "not_found"           // 404 — record doesn't exist to update/delete
  | "conflict"            // 409 — FK violation or unique constraint
  | "network_exhausted"   // Recoverable error (network) exceeded max retry attempts
  | "unknown_permanent";  // Any other 4xx we don't recognise

export interface SyncError {
  id?: number; // auto-increment
  original_item: SyncQueueItem;
  reason: SyncErrorReason;
  http_status?: number;
  error_message: string;
  failed_at: string; // ISO datetime
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
  sync_errors!:    Table<SyncError>;

  constructor() {
    super("kairos_db");

    // v1 — original schema
    this.version(1).stores({
      daily_records: "id, user_id, date, category, synced",
      contacts:      "id, user_id, name, status, synced",
      visit_history: "id, contact_id, visit_date, next_visit_date, synced",
      profiles:      "id",
      sync_queue:    "++id, table_name, record_id, operation, created_at",
    });

    // v2 — adds sync_errors table for permanent failure audit trail
    this.version(2).stores({
      daily_records: "id, user_id, date, category, synced",
      contacts:      "id, user_id, name, status, synced",
      visit_history: "id, contact_id, visit_date, next_visit_date, synced",
      profiles:      "id",
      sync_queue:    "++id, table_name, record_id, operation, created_at",
      sync_errors:   "++id, failed_at",
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
