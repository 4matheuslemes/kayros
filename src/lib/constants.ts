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

export const DAILY_ENCOURAGEMENT_MESSAGES = [
  // Texto diário e leitura da Bíblia
  "Já leu o texto de hoje?",
  "Já considerou o texto diário em família?",
  "Que tal ler um trecho da Bíblia hoje?",
  "Separou um tempo para meditar na Palavra de Deus?",
  "Já leu algum salmo hoje?",

  // Estudo pessoal
  "Fez seu estudo pessoal hoje?",
  "Que tal separar uns minutos para pesquisar um tema bíblico?",
  "Já decidiu o que vai estudar essa semana?",
  "Pesquisou algo nas Escrituras essa semana?",
  "Já memorizou algum texto bíblico ultimamente?",

  // Preparação de reuniões
  "Preparou sua parte da Reunião Vida e Ministério?",
  "Já separou o material do estudo d'A Sentinela desta semana?",
  "Preparou os comentários que vai dar na reunião?",
  "Está em dia com a matéria da semana?",
  "Já revisou os cânticos do Reino da próxima reunião?",
  "Vai participar comentando na reunião essa semana?",

  // Oração
  "Já orou hoje?",
  "Que tal agradecer a Jeová por algo específico hoje?",
  "Separou um tempo para orar em família?",
  "Já orou por alguém da congregação hoje?",

  // Adoração em família
  "Já teve a Noite de Adoração em Família essa semana?",
  "Que tal assistir a um programa do tv.jw.org com a família?",
  "Já conversou com a família sobre algum tema espiritual essa semana?",
  "Reservou um tempo para adoração em família?",

  // Publicações e recursos digitais
  "Está em dia com a Sentinela e a Despertai! mais recentes?",
  "Já conferiu se tem alguma publicação nova pra ler?",
  "Já explorou algo novo no JW Library?",
  "Assistiu a algum vídeo novo do JW Broadcasting?",
  "Já visitou o jw.org hoje?",

  // Congregação e irmãos
  "Está mantendo boa comunhão com os irmãos da congregação?",
  "Já entrou em contato com algum irmão ou irmã essa semana?",
  "Que tal mandar uma mensagem de ânimo para alguém da congregação?",
  "Já pensou em como mostrar hospitalidade essa semana?",

  // Congressos e assembleias
  "Está se preparando para o próximo congresso ou assembleia?",
  "Já separou um tempo pra descansar e refletir essa semana?",

  // Qualidades cristãs e reflexão pessoal
  "Como está sua paciência e amor no dia a dia?",
  "Está se esforçando para cultivar mais amor pelo próximo?",
  "Já pensou em como aplicar o que aprendeu essa semana?",
  "Como está seu 'escudo da fé' essa semana?",
  "Está se esforçando para 'comprar todo o tempo oportuno'?",

  // Metas espirituais
  "Já pensou em algum objetivo espiritual para esse mês?",
  "Está trabalhando em algum objetivo teocrático?",
  "Que tal revisar suas metas espirituais essa semana?",

  // Perseverança e gratidão
  "Já teve um momento de gratidão a Jeová hoje?",
  "Como está sua confiança em Jeová essa semana?",
  "Já pensou em como perseverar diante de alguma dificuldade?",

  // Motivacional geral
  "Um pequeno hábito espiritual hoje faz diferença amanhã.",
  "Reserve um tempinho hoje só para se alimentar espiritualmente.",
  "Que tal fortalecer sua fé com um pouco de leitura hoje?",
  "Como está sua rotina espiritual essa semana?",
  "Já pensou em algo bom para comentar na próxima reunião?",
  "Reservou um tempo para se preparar espiritualmente hoje?",
];

