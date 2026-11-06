import "server-only";

import {
  aggregateQuestionKpis,
  aggregateQuestionsByDate,
  aggregateTopics,
  getDiscipline,
  listQuestionSessions,
} from "@/lib/db/repository";
import { dailySeries, type DisciplineId, type FilterState, type UserId } from "@/lib/domain";

export async function getDisciplineAnalytics(userId: UserId, disciplineId: DisciplineId, filters: FilterState) {
  const discipline = await getDiscipline(disciplineId);
  if (!discipline) return null;
  const scoped = { from: filters.from, to: filters.to, disciplineIds: [disciplineId] };
  const [kpis, dailyRows, topics, history] = await Promise.all([
    aggregateQuestionKpis(userId, scoped),
    aggregateQuestionsByDate(userId, scoped),
    aggregateTopics(userId, scoped, filters.includeSubtopics),
    listQuestionSessions(userId, scoped, 1, 25),
  ]);
  return { discipline, kpis, evolution: dailySeries(dailyRows), topics, history };
}
