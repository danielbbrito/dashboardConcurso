export const BLOCKS = ["basico", "especifico"] as const;
export type Block = (typeof BLOCKS)[number];

export const DIFFICULTIES = ["muito_facil", "facil", "medio", "dificil"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  muito_facil: "Muito fácil",
  facil: "Fácil",
  medio: "Médio",
  dificil: "Difícil",
};

export const DIFFICULTY_VALUES: Record<Difficulty, 1 | 2 | 3 | 4> = {
  muito_facil: 1,
  facil: 2,
  medio: 3,
  dificil: 4,
};

export const RANKING_METRICS = ["accuracy", "safeAccuracy"] as const;
export type RankingMetric = (typeof RANKING_METRICS)[number];

export const PERIOD_PRESETS = ["today", "7d", "30d", "90d", "month", "all", "custom"] as const;
export type PeriodPreset = (typeof PERIOD_PRESETS)[number];

export const API_ERROR_CODES = [
  "UNAUTHENTICATED",
  "UNAUTHORIZED",
  "VALIDATION_ERROR",
  "NOT_FOUND",
  "CONFLICT",
  "SERVER_ERROR",
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 25;
export const APPLICATION_TIMEZONE = "America/Sao_Paulo";

export function isBlock(value: unknown): value is Block {
  return typeof value === "string" && (BLOCKS as readonly string[]).includes(value);
}

export function isDifficulty(value: unknown): value is Difficulty {
  return typeof value === "string" && (DIFFICULTIES as readonly string[]).includes(value);
}

export function isRankingMetric(value: unknown): value is RankingMetric {
  return typeof value === "string" && (RANKING_METRICS as readonly string[]).includes(value);
}

export function isPeriodPreset(value: unknown): value is PeriodPreset {
  return typeof value === "string" && (PERIOD_PRESETS as readonly string[]).includes(value);
}
