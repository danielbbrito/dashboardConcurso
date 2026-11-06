import type { Block, RankingMetric } from "./constants";
import { toDateOnly } from "./date-only";
import type { DateOnly, DisciplineId } from "./types";

export type MetricQuestion = {
  data: DateOnly;
  disciplineId: DisciplineId;
  disciplineName: string;
  block: Block;
  attempted: number;
  correct: number;
  guesses: number;
  correctGuesses: number;
};

export type Kpis = {
  attempted: number;
  correct: number;
  errors: number;
  guesses: number;
  correctGuesses: number;
  incorrectGuesses: number;
  correctWithoutGuess: number;
  accuracy: number | null;
  safeAccuracy: number | null;
  nonGuessAccuracy: number | null;
  guessPercentage: number | null;
  correctGuessRate: number | null;
  netScore: number;
  netScorePercentage: number | null;
};

export type DailySeriesPoint = {
  data: DateOnly;
  attempted: number;
  correct: number;
  guesses: number;
  correctGuesses: number;
  attemptedAccumulated: number;
  correctAccumulated: number;
  guessesAccumulated: number;
  correctGuessesAccumulated: number;
  accumulatedAccuracy: number;
  accumulatedSafeAccuracy: number;
  accumulatedNetScore: number;
};

export type WeeklySeriesPoint = {
  weekStart: DateOnly;
  weekEnd: DateOnly;
  attempted: number;
  correct: number;
  guesses: number;
  correctGuesses: number;
  accuracy: number;
};

export type RankingRow = {
  disciplineId: DisciplineId;
  disciplineName: string;
  block: Block;
  attempted: number;
  correct: number;
  guesses: number;
  correctGuesses: number;
  accuracy: number;
  safeAccuracy: number;
  netScore: number;
};

export type ComparisonDisciplineRow = {
  disciplineId: DisciplineId;
  disciplineName: string;
  block: Block;
  attemptedInPeriod: number;
  attemptedAtA: number;
  attemptedAtB: number;
  accuracyAtA: number | null;
  accuracyAtB: number | null;
  deltaPercentagePoints: number | null;
};

export type Comparison = {
  cutoffA: DateOnly;
  cutoffB: DateOnly;
  kpisAtA: Kpis;
  kpisAtB: Kpis;
  byDiscipline: ComparisonDisciplineRow[];
};

export type StudyHourMetricRow = {
  data: DateOnly;
  hours: number;
};

export type DailyHoursPoint = {
  data: DateOnly;
  hours: number;
  hoursAccumulated: number;
};

export type WeeklyHoursPoint = {
  weekStart: DateOnly;
  weekEnd: DateOnly;
  hours: number;
  activeDays: number;
  averagePerDay: number;
};

function ratio(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}

function addDays(value: DateOnly, days: number): DateOnly {
  const current = new Date(`${value}T12:00:00Z`);
  current.setUTCDate(current.getUTCDate() + days);
  return toDateOnly(current.toISOString().slice(0, 10));
}

function mondayWeekStart(value: DateOnly): DateOnly {
  const current = new Date(`${value}T12:00:00Z`);
  const mondayOffset = (current.getUTCDay() + 6) % 7;
  return addDays(value, -mondayOffset);
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const groupKey = key(item);
    const group = groups.get(groupKey) ?? [];
    group.push(item);
    groups.set(groupKey, group);
  }
  return groups;
}

export function computeKpis(rows: MetricQuestion[]): Kpis {
  const attempted = rows.reduce((sum, row) => sum + row.attempted, 0);
  const correct = rows.reduce((sum, row) => sum + row.correct, 0);
  const guesses = rows.reduce((sum, row) => sum + row.guesses, 0);
  const correctGuesses = rows.reduce((sum, row) => sum + row.correctGuesses, 0);
  const errors = attempted - correct;
  const correctWithoutGuess = correct - correctGuesses;
  const netScore = correct - 0.5 * errors;

  return {
    attempted,
    correct,
    errors,
    guesses,
    correctGuesses,
    incorrectGuesses: guesses - correctGuesses,
    correctWithoutGuess,
    accuracy: ratio(correct, attempted),
    safeAccuracy: ratio(correctWithoutGuess, attempted),
    nonGuessAccuracy: ratio(correctWithoutGuess, attempted - guesses),
    guessPercentage: ratio(guesses, attempted),
    correctGuessRate: ratio(correctGuesses, guesses),
    netScore,
    netScorePercentage: ratio(netScore, attempted),
  };
}

export function dailySeries(rows: MetricQuestion[]): DailySeriesPoint[] {
  const byDate = groupBy(rows, (row) => row.data);
  const accumulated = { attempted: 0, correct: 0, guesses: 0, correctGuesses: 0 };
  return [...byDate.keys()].sort().map((data) => {
    const daily = computeKpis(byDate.get(data) ?? []);
    accumulated.attempted += daily.attempted;
    accumulated.correct += daily.correct;
    accumulated.guesses += daily.guesses;
    accumulated.correctGuesses += daily.correctGuesses;
    return {
      data: toDateOnly(data),
      attempted: daily.attempted,
      correct: daily.correct,
      guesses: daily.guesses,
      correctGuesses: daily.correctGuesses,
      attemptedAccumulated: accumulated.attempted,
      correctAccumulated: accumulated.correct,
      guessesAccumulated: accumulated.guesses,
      correctGuessesAccumulated: accumulated.correctGuesses,
      accumulatedAccuracy: accumulated.correct / accumulated.attempted,
      accumulatedSafeAccuracy:
        (accumulated.correct - accumulated.correctGuesses) / accumulated.attempted,
      accumulatedNetScore:
        accumulated.correct - 0.5 * (accumulated.attempted - accumulated.correct),
    };
  });
}

export function weeklySeries(rows: MetricQuestion[]): WeeklySeriesPoint[] {
  const byWeek = groupBy(rows, (row) => mondayWeekStart(row.data));
  return [...byWeek.keys()].sort().map((weekStart) => {
    const values = computeKpis(byWeek.get(weekStart) ?? []);
    return {
      weekStart: toDateOnly(weekStart),
      weekEnd: addDays(toDateOnly(weekStart), 6),
      attempted: values.attempted,
      correct: values.correct,
      guesses: values.guesses,
      correctGuesses: values.correctGuesses,
      accuracy: values.accuracy ?? 0,
    };
  });
}

export function rankDisciplines(
  rows: MetricQuestion[],
  minimumQuestions = 20,
  metric: RankingMetric = "accuracy",
): RankingRow[] {
  const groups = groupBy(rows, (row) => String(row.disciplineId));
  const ranking: RankingRow[] = [];
  for (const group of groups.values()) {
    const first = group[0];
    const values = computeKpis(group);
    if (!first || values.attempted < minimumQuestions) {
      continue;
    }
    ranking.push({
      disciplineId: first.disciplineId,
      disciplineName: first.disciplineName,
      block: first.block,
      attempted: values.attempted,
      correct: values.correct,
      guesses: values.guesses,
      correctGuesses: values.correctGuesses,
      accuracy: values.accuracy ?? 0,
      safeAccuracy: values.safeAccuracy ?? 0,
      netScore: values.netScore,
    });
  }

  return ranking.sort((a, b) => {
    const difference = b[metric] - a[metric];
    if (difference !== 0) return difference;
    if (b.attempted !== a.attempted) return b.attempted - a.attempted;
    return a.disciplineName.localeCompare(b.disciplineName, "pt-BR");
  });
}

export function compareAccumulated(
  rows: MetricQuestion[],
  cutoffA: DateOnly,
  cutoffB: DateOnly,
): Comparison {
  if (cutoffA >= cutoffB) {
    throw new Error("cutoffA must be before cutoffB");
  }
  const atA = rows.filter((row) => row.data <= cutoffA);
  const atB = rows.filter((row) => row.data <= cutoffB);
  const inPeriod = rows.filter((row) => row.data > cutoffA && row.data <= cutoffB);
  const byDiscipline = groupBy(atB, (row) => String(row.disciplineId));
  const comparisonRows: ComparisonDisciplineRow[] = [];

  for (const groupB of byDiscipline.values()) {
    const first = groupB[0];
    const periodRows = inPeriod.filter((row) => row.disciplineId === first?.disciplineId);
    if (!first || periodRows.length === 0) continue;
    const groupA = atA.filter((row) => row.disciplineId === first.disciplineId);
    const valuesA = computeKpis(groupA);
    const valuesB = computeKpis(groupB);
    const delta =
      valuesA.accuracy === null
        ? (valuesB.accuracy ?? 0) * 100
        : valuesB.accuracy === null
          ? null
          : (valuesB.accuracy - valuesA.accuracy) * 100;
    comparisonRows.push({
      disciplineId: first.disciplineId,
      disciplineName: first.disciplineName,
      block: first.block,
      attemptedInPeriod: computeKpis(periodRows).attempted,
      attemptedAtA: valuesA.attempted,
      attemptedAtB: valuesB.attempted,
      accuracyAtA: valuesA.accuracy,
      accuracyAtB: valuesB.accuracy,
      deltaPercentagePoints: delta,
    });
  }

  comparisonRows.sort((a, b) => (b.deltaPercentagePoints ?? 0) - (a.deltaPercentagePoints ?? 0));
  return {
    cutoffA,
    cutoffB,
    kpisAtA: computeKpis(atA),
    kpisAtB: computeKpis(atB),
    byDiscipline: comparisonRows,
  };
}

export function dailyHoursSeries(rows: StudyHourMetricRow[]): DailyHoursPoint[] {
  const byDate = groupBy(rows, (row) => row.data);
  let accumulated = 0;
  return [...byDate.keys()].sort().map((data) => {
    const hours = (byDate.get(data) ?? []).reduce((sum, row) => sum + row.hours, 0);
    accumulated += hours;
    return { data: toDateOnly(data), hours, hoursAccumulated: accumulated };
  });
}

export function weeklyHoursSeries(rows: StudyHourMetricRow[]): WeeklyHoursPoint[] {
  const byWeek = groupBy(rows, (row) => mondayWeekStart(row.data));
  return [...byWeek.keys()].sort().reverse().map((weekStart) => {
    const group = byWeek.get(weekStart) ?? [];
    const hours = group.reduce((sum, row) => sum + row.hours, 0);
    const activeDays = new Set(group.map((row) => row.data)).size;
    return {
      weekStart: toDateOnly(weekStart),
      weekEnd: addDays(toDateOnly(weekStart), 6),
      hours,
      activeDays,
      averagePerDay: hours / activeDays,
    };
  });
}
