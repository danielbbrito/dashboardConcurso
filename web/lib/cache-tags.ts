import "server-only";

import { revalidateTag } from "next/cache";

export const CACHE_TAGS = {
  catalog: "catalog",
  overview: "overview",
  disciplineAnalytics: "discipline-analytics",
  hours: "hours",
  topics: "topics",
  reviews: "reviews",
  cycle: "cycle",
} as const;

export function scopedCacheTag(tag: string, userId: string, key = "all"): string {
  return `${tag}:${userId}:${key}`;
}

export function invalidateUserTag(tag: string, userId: string): void {
  revalidateTag(scopedCacheTag(tag, userId), "max");
}
