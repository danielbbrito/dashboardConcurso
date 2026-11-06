import "server-only";

import { aggregateStudyHoursByDate } from "@/lib/db/repository";
import { dailyHoursSeries, toDateOnly, weeklyHoursSeries, type UserId } from "@/lib/domain";

export async function getHoursAnalytics(userId: UserId, filters: { from?: import("@/lib/domain").DateOnly | null; to?: import("@/lib/domain").DateOnly | null }) {
  const rows = (await aggregateStudyHoursByDate(userId, filters)).map((row) => ({ data: toDateOnly(row.data), hours: Number(row.hours) }));
  const daily = dailyHoursSeries(rows);
  const weekly = weeklyHoursSeries(rows);
  const total = daily.reduce((sum, row) => sum + row.hours, 0);
  const activeDays = daily.length;
  const activeWeeks = weekly.length;
  return { daily, weekly, kpis: { total, activeDays, averagePerDay: activeDays > 0 ? total / activeDays : 0, averagePerWeek: activeWeeks > 0 ? total / activeWeeks : 0 } };
}
