import { toDateOnly, type DateOnly, type StudiedTopic } from "@/lib/domain";

export type ReviewEntry = StudiedTopic & { reviewDate: DateOnly; disciplineName?: string };

export function startOfReviewWeek(value: DateOnly): DateOnly {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - date.getUTCDay());
  return toDateOnly(date.toISOString().slice(0, 10));
}

export function reviewSaturday(value: DateOnly): DateOnly {
  return addDays(startOfReviewWeek(value), 6);
}

export function addDays(value: DateOnly, days: number): DateOnly {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateOnly(date.toISOString().slice(0, 10));
}

export function scheduleReviews(topics: Array<StudiedTopic & { disciplineName?: string }>, week: DateOnly): ReviewEntry[] {
  const start = startOfReviewWeek(week);
  const end = addDays(start, 6);
  const saturday = addDays(start, 6);
  return topics.filter((topic) => topic.studyDate >= start && topic.studyDate <= end).map((topic) => ({ ...topic, reviewDate: saturday }));
}
