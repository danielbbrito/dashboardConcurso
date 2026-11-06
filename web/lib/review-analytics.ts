import "server-only";

import { listStudiedTopics } from "@/lib/db/repository";
import { type DateOnly, type UserId } from "@/lib/domain";
import { addDays, scheduleReviews, startOfReviewWeek } from "@/lib/reviews";

export async function getReviewAgenda(userId: UserId, week: DateOnly) {
  const start = startOfReviewWeek(week);
  const topics = await listStudiedTopics(userId, { from: start, to: addDays(start, 6) }, 1, 100);
  return { week: start, saturday: addDays(start, 6), items: scheduleReviews(topics.items, start) };
}
