import "server-only";

import {
  aggregateQuestionKpis,
  aggregateQuestionsByDate,
  aggregateQuestionsByDiscipline,
} from "@/lib/db/repository";
import {
  dailySeries,
  rankDisciplines,
  weeklySeries,
  type FilterState,
  type UserId,
} from "@/lib/domain";

export async function getOverviewData(userId: UserId, filters: FilterState) {
  const repositoryFilters = {
    from: filters.from,
    to: filters.to,
    disciplineIds: filters.disciplineIds,
  };
  const [kpis, dailyRows, disciplineRows] = await Promise.all([
    aggregateQuestionKpis(userId, repositoryFilters),
    aggregateQuestionsByDate(userId, repositoryFilters),
    aggregateQuestionsByDiscipline(userId, repositoryFilters),
  ]);
  return {
    kpis,
    daily: dailySeries(dailyRows),
    weekly: weeklySeries(dailyRows),
    disciplinePerformance: rankDisciplines(disciplineRows, 0),
    ranking: rankDisciplines(disciplineRows, filters.minQuestions, filters.metric),
  };
}
