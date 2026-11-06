import {
  DEFAULT_PAGE_SIZE,
  isDateOnly,
  isPeriodPreset,
  isRankingMetric,
  type DateOnly,
  type DisciplineId,
  type FilterState,
  type PeriodPreset,
} from "@/lib/domain";

const DEFAULT_PERIOD: PeriodPreset = "30d";
const DEFAULT_MIN_QUESTIONS = 10;

type QueryInput = URLSearchParams | Readonly<Record<string, string | string[] | undefined>>;

function valueOf(input: QueryInput, key: string): string | undefined {
  if (input instanceof URLSearchParams) return input.get(key) ?? undefined;
  const value = input[key];
  return Array.isArray(value) ? value[0] : value;
}

function addDays(value: DateOnly, days: number): DateOnly {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10) as DateOnly;
}

function firstOfMonth(value: DateOnly): DateOnly {
  return `${value.slice(0, 7)}-01` as DateOnly;
}

function parseDate(value: string | undefined): DateOnly | null {
  return value && isDateOnly(value) ? value : null;
}

function normalizePeriod(value: string | undefined): PeriodPreset {
  return value && isPeriodPreset(value) ? value : DEFAULT_PERIOD;
}

function normalizeDates(period: PeriodPreset, from: DateOnly | null, to: DateOnly | null, today: DateOnly): Pick<FilterState, "from" | "to"> {
  if (period === "all") return { from: null, to: null };
  if (period === "custom") {
    let start = from ?? addDays(today, -29);
    let end = to ?? today;
    if (start > today) start = today;
    if (end > today) end = today;
    if (start > end) [start, end] = [end, start];
    return { from: start, to: end };
  }
  if (period === "today") return { from: today, to: today };
  if (period === "7d") return { from: addDays(today, -6), to: today };
  if (period === "90d") return { from: addDays(today, -89), to: today };
  if (period === "month") return { from: firstOfMonth(today), to: today };
  return { from: addDays(today, -29), to: today };
}

function normalizeDisciplines(value: string | undefined): DisciplineId[] {
  return [...new Set((value ?? "")
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item > 0))]
    .sort((a, b) => a - b) as DisciplineId[];
}

function normalizeNonNegativeInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? Math.min(parsed, 1_000_000) : fallback;
}

function sundayOfWeek(value: DateOnly): DateOnly {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - date.getUTCDay());
  return date.toISOString().slice(0, 10) as DateOnly;
}

export function parseFilters(input: QueryInput, today: DateOnly): FilterState {
  const period = normalizePeriod(valueOf(input, "period"));
  const dates = normalizeDates(period, parseDate(valueOf(input, "from")), parseDate(valueOf(input, "to")), today);
  const metricValue = valueOf(input, "metric");
  const week = parseDate(valueOf(input, "week"));
  return {
    period,
    ...dates,
    disciplineIds: normalizeDisciplines(valueOf(input, "disciplines")),
    metric: metricValue && isRankingMetric(metricValue) ? metricValue : "accuracy",
    minQuestions: normalizeNonNegativeInteger(valueOf(input, "minQuestions"), DEFAULT_MIN_QUESTIONS),
    includeSubtopics: ["1", "true", "yes"].includes(valueOf(input, "subtopics") ?? ""),
    week: week ? sundayOfWeek(week) : null,
  };
}

export function serializeFilters(filters: FilterState): string {
  const params = new URLSearchParams();
  params.set("period", filters.period);
  if (filters.period === "custom" && filters.from && filters.to) {
    params.set("from", filters.from);
    params.set("to", filters.to);
  }
  if (filters.disciplineIds.length > 0) params.set("disciplines", filters.disciplineIds.join(","));
  if (filters.metric !== "accuracy") params.set("metric", filters.metric);
  if (filters.minQuestions !== DEFAULT_MIN_QUESTIONS) params.set("minQuestions", String(filters.minQuestions));
  if (filters.includeSubtopics) params.set("subtopics", "1");
  if (filters.week) params.set("week", filters.week);
  return params.toString();
}

export function mergeFilterQuery(current: QueryInput, updates: Partial<FilterState>, today: DateOnly): string {
  const merged = { ...parseFilters(current, today), ...updates };
  return serializeFilters(merged);
}

export function defaultPageSize(): number {
  return DEFAULT_PAGE_SIZE;
}
