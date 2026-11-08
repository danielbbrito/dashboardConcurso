import test from "node:test";
import assert from "node:assert/strict";

import {
  toDateOnly,
  validateCycleHours,
  validateCycleOrder,
  validateFilters,
  validatePageSize,
  validateQuestionSession,
  validateStudiedTopic,
  validateStudyHours,
} from "./index";
import type { DisciplineId } from "./index";

const D1 = 1 as DisciplineId;
const D2 = 2 as DisciplineId;

test("validates question relationships and stable field errors", () => {
  const valid = validateQuestionSession(
    {
      studyDate: "2026-08-01",
      disciplineId: D1,
      questionsAttempted: 10,
      correctAnswers: 8,
      guesses: 2,
      correctGuesses: 1,
      difficulty: "medio",
      topic: null,
      subtopic: null,
    },
    { today: toDateOnly("2026-08-10") },
  );
  assert.equal(valid.success, true);

  const invalid = validateQuestionSession(
    {
      studyDate: "2026-08-11",
      disciplineId: D1,
      questionsAttempted: 10,
      correctAnswers: 11,
      guesses: 2,
      correctGuesses: 3,
      difficulty: "medio",
      topic: null,
      subtopic: "Subtopico",
    },
    { today: toDateOnly("2026-08-10") },
  );
  assert.equal(invalid.success, false);
  if (!invalid.success) {
    assert.equal(invalid.error.error.code, "VALIDATION_ERROR");
    assert.ok(invalid.error.error.fields?.correctAnswers);
    assert.ok(invalid.error.error.fields?.studyDate);
    assert.ok(invalid.error.error.fields?.subtopic);
  }
});

test("validates hours, topics, and future dates", () => {
  assert.equal(
    validateStudyHours({ studyDate: "2026-08-10", hours: 1.25 }, { today: toDateOnly("2026-08-10") }).success,
    true,
  );
  assert.equal(
    validateStudyHours({ studyDate: "2026-08-10", hours: 24.001 }, { today: toDateOnly("2026-08-10") }).success,
    false,
  );
  assert.equal(
    validateStudiedTopic({ studyDate: "2026-08-10", disciplineId: D1, topic: "", subtopic: null }, { today: toDateOnly("2026-08-10") }).success,
    false,
  );
  assert.equal(
    validateStudiedTopic({ studyDate: "2026-08-11", disciplineId: D1, topic: "Direito", subtopic: null }, { today: toDateOnly("2026-08-10") }).success,
    false,
  );
});

test("preserves legacy text length and hour precision during migration", () => {
  const longTopic = "x".repeat(201);
  assert.equal(validateQuestionSession({
    studyDate: "2026-08-10",
    disciplineId: 1,
    questionsAttempted: 10,
    correctAnswers: 8,
    guesses: 1,
    correctGuesses: 1,
    difficulty: "medio",
    topic: longTopic,
    subtopic: null,
  }, { today: toDateOnly("2026-08-10"), allowLegacyTextLength: true }).success, true);
  assert.equal(validateStudyHours({ studyDate: "2026-08-10", hours: 3.383 }, { today: toDateOnly("2026-08-10"), allowLegacyPrecision: true }).success, true);
});

test("validates filter ranges and normalizes page size bounds", () => {
  const invalid = validateFilters({
    period: "custom",
    from: "2026-08-20",
    to: "2026-08-10",
    disciplineIds: [D1, D1],
    metric: "unknown",
    minQuestions: -1,
    includeSubtopics: false,
    week: null,
  });
  assert.equal(invalid.success, false);
  assert.equal(validatePageSize(0), 25);
  assert.equal(validatePageSize(1000), 100);
});

test("validates cycle uniqueness, known disciplines, and hour limits", () => {
  assert.equal(validateCycleOrder([D1, D2], [D1, D2]).success, true);
  assert.equal(validateCycleOrder([D1, D1], [D1, D2]).success, false);
  assert.equal(validateCycleOrder([D1, 3 as DisciplineId], [D1, D2]).success, false);
  assert.equal(validateCycleHours({ "1": 1.5 }).success, true);
  assert.equal(validateCycleHours({ "1": 60.1 }).success, false);
});
