// ─────────────────────────────────────────────────────────────
// App-wide constants — change APP_NAME here and it propagates
// everywhere in the codebase (UI copy, metadata, manifests…)
// ─────────────────────────────────────────────────────────────

export const APP_NAME = "Kairós" as const;
export const APP_DESCRIPTION = "Registro pessoal de atividade de pregação";
export const APP_SLUG = "kairos" as const;

// Service year starts in September (month index 8, 0-based)
export const SERVICE_YEAR_START_MONTH = 9; // 1-based: September

export const DEFAULT_MONTHLY_GOAL_HOURS = 50;

export const ACTIVITY_CATEGORIES = [
  { value: "convencional", label: "Convencional" },
  { value: "testemunho_publico", label: "Testemunho Público" },
  { value: "ldc", label: "LDC" },
  { value: "carta", label: "Carta" },
] as const;

export const ACTIVITY_COLORS: Record<string, string> = {
  "convencional": "bg-blue-500",
  "testemunho_publico": "bg-emerald-500",
  "ldc": "bg-amber-500",
  "carta": "bg-purple-500",
};

export type ActivityCategory =
  (typeof ACTIVITY_CATEGORIES)[number]["value"];

export const CONTACT_STATUS = [
  { value: "revisita", label: "Revisita" },
  { value: "estudo_ativo", label: "Estudo Ativo" },
] as const;

export type ContactStatus = (typeof CONTACT_STATUS)[number]["value"];

export const ACTIVITY_SOURCE = {
  TIMER: "timer",
  MANUAL: "manual",
} as const;

export type ActivitySource =
  (typeof ACTIVITY_SOURCE)[keyof typeof ACTIVITY_SOURCE];
