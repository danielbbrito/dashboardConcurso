import test from "node:test";
import assert from "node:assert/strict";

import { toDateOnly } from "@/lib/domain";
import { addDays, reviewSaturday, scheduleReviews, startOfReviewWeek } from "./reviews";

test("uses Sunday-to-Saturday review weeks", () => {
  assert.equal(startOfReviewWeek(toDateOnly("2026-08-05")), "2026-08-02");
  assert.equal(reviewSaturday(toDateOnly("2026-08-05")), "2026-08-08");
  assert.equal(addDays(toDateOnly("2026-08-08"), 1), "2026-08-09");
});

test("schedules every topic in the selected week on its Saturday", () => {
  const topics = [
    { id: "1", userId: "u" as never, studyDate: toDateOnly("2026-08-02"), disciplineId: 1 as never, topic: "A", subtopic: null, createdAt: "" },
    { id: "2", userId: "u" as never, studyDate: toDateOnly("2026-08-08"), disciplineId: 1 as never, topic: "B", subtopic: null, createdAt: "" },
  ];
  assert.deepEqual(scheduleReviews(topics, toDateOnly("2026-08-05")).map((topic) => topic.reviewDate), ["2026-08-08", "2026-08-08"]);
});
