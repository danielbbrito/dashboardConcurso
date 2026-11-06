import test from "node:test";
import assert from "node:assert/strict";

import { parseFilters, serializeFilters } from "./filters";
import { toDateOnly } from "@/lib/domain";

const today = toDateOnly("2026-10-21");

test("normalizes invalid values and calculates preset ranges", () => {
  const filters = parseFilters(new URLSearchParams("period=30d&disciplines=3,invalid,1,3&metric=bad&minQuestions=-4"), today);
  assert.deepEqual(filters.disciplineIds, [1, 3]);
  assert.equal(filters.from, "2026-09-22");
  assert.equal(filters.to, "2026-10-21");
  assert.equal(filters.metric, "accuracy");
  assert.equal(filters.minQuestions, 10);
});

test("normalizes future and reversed custom ranges consistently", () => {
  const filters = parseFilters({ period: "custom", from: "2026-11-01", to: "2026-09-01" }, today);
  assert.deepEqual({ from: filters.from, to: filters.to }, { from: "2026-09-01", to: "2026-10-21" });
});

test("canonical serialization round-trips shareable state", () => {
  const filters = parseFilters(new URLSearchParams("period=custom&from=2026-10-10&to=2026-10-20&disciplines=2,1&metric=safeAccuracy&minQuestions=20&subtopics=1&week=2026-10-21"), today);
  const serialized = serializeFilters(filters);
  assert.equal(serialized, "period=custom&from=2026-10-10&to=2026-10-20&disciplines=1%2C2&metric=safeAccuracy&minQuestions=20&subtopics=1&week=2026-10-18");
  assert.deepEqual(parseFilters(new URLSearchParams(serialized), today), filters);
});
