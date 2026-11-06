import test from "node:test";
import assert from "node:assert/strict";

import {
  compareAccumulated,
  computeKpis,
  dailyHoursSeries,
  dailySeries,
  rankDisciplines,
  toDateOnly,
  weeklyHoursSeries,
  weeklySeries,
} from "./index";
import type { DisciplineId } from "./index";

const D1 = 1 as DisciplineId;
const D2 = 2 as DisciplineId;

function question(
  data: string,
  disciplineId: DisciplineId,
  disciplineName: string,
  attempted: number,
  correct: number,
  guesses: number,
  correctGuesses: number,
) {
  return {
    data: toDateOnly(data),
    disciplineId,
    disciplineName,
    block: disciplineId === D1 ? "basico" as const : "especifico" as const,
    attempted,
    correct,
    guesses,
    correctGuesses,
  };
}

test("computes current KPI formulas and unavailable ratios", () => {
  const values = computeKpis([
    question("2026-08-01", D1, "A", 10, 8, 2, 1),
    question("2026-08-02", D2, "B", 5, 2, 1, 0),
  ]);

  assert.equal(values.attempted, 15);
  assert.equal(values.correct, 10);
  assert.equal(values.correctWithoutGuess, 9);
  assert.equal(values.netScore, 7.5);
  assert.equal(values.nonGuessAccuracy, 9 / 12);

  const allGuesses = computeKpis([question("2026-08-01", D1, "A", 10, 5, 10, 5)]);
  assert.equal(allGuesses.nonGuessAccuracy, null);
  assert.equal(allGuesses.safeAccuracy, 0);
});

test("builds daily and Monday-to-Sunday weekly series", () => {
  const rows = [
    question("2026-08-03", D1, "A", 10, 8, 2, 1),
    question("2026-08-05", D2, "B", 5, 2, 1, 0),
    question("2026-08-10", D1, "A", 10, 5, 0, 0),
  ];
  const daily = dailySeries(rows);
  assert.deepEqual(daily.map((row) => row.data), ["2026-08-03", "2026-08-05", "2026-08-10"]);
  assert.equal(daily[1]?.attemptedAccumulated, 15);
  assert.equal(weeklySeries(rows)[0]?.accuracy, 10 / 15);
  assert.equal(weeklySeries(rows)[1]?.weekEnd, "2026-08-16");
});

test("applies ranking threshold, metric selection, and tie ordering", () => {
  const rows = [
    question("2026-08-01", D1, "A", 20, 16, 4, 2),
    question("2026-08-02", D2, "B", 20, 20, 20, 20),
  ];
  assert.deepEqual(rankDisciplines(rows, 20).map((row) => row.disciplineName), ["B", "A"]);
  assert.deepEqual(rankDisciplines(rows, 20, "safeAccuracy").map((row) => row.disciplineName), ["A", "B"]);
  assert.equal(rankDisciplines(rows, 21).length, 0);
});

test("compares accumulated cutoffs and rejects reversed dates", () => {
  const rows = [
    question("2026-08-01", D1, "A", 10, 5, 2, 1),
    question("2026-09-01", D1, "A", 10, 8, 2, 1),
    question("2026-09-15", D2, "B", 10, 9, 1, 0),
  ];
  const result = compareAccumulated(rows, toDateOnly("2026-08-15"), toDateOnly("2026-09-10"));
  assert.equal(result.kpisAtA.attempted, 10);
  assert.equal(result.kpisAtB.attempted, 20);
  assert.equal(result.byDiscipline[0]?.disciplineName, "A");
  assert.throws(() => compareAccumulated(rows, toDateOnly("2026-09-10"), toDateOnly("2026-09-01")));
});

test("aggregates daily and weekly study hours", () => {
  const rows = [
    { data: toDateOnly("2026-08-03"), hours: 2 },
    { data: toDateOnly("2026-08-03"), hours: 1.5 },
    { data: toDateOnly("2026-08-10"), hours: 3 },
  ];
  assert.deepEqual(dailyHoursSeries(rows).map((row) => row.hours), [3.5, 3]);
  assert.equal(weeklyHoursSeries(rows)[1]?.averagePerDay, 3.5);
});
