import "server-only";

import { aggregateDifficulty, aggregateTopics } from "@/lib/db/repository";
import { type FilterState, type UserId } from "@/lib/domain";

export async function getTopicAnalytics(userId: UserId, filters: FilterState) {
  const scope = { from: filters.from, to: filters.to, disciplineIds: filters.disciplineIds };
  const [topics, difficulty] = await Promise.all([aggregateTopics(userId, scope, filters.includeSubtopics), aggregateDifficulty(userId, scope)]);
  const withThreshold = topics.filter((topic) => topic.attempted >= filters.minQuestions);
  const attempted = topics.reduce((sum, topic) => sum + topic.attempted, 0);
  const correct = topics.reduce((sum, topic) => sum + topic.correct, 0);
  return {
    kpis: {
      sessionsWithTopics: topics.reduce((sum, topic) => sum + topic.sessions, 0),
      questionsWithTopics: attempted,
      distinctTopics: new Set(topics.map((topic) => topic.topic)).size,
      accuracy: attempted > 0 ? correct / attempted : null,
    },
    topics: withThreshold,
    allTopics: topics,
    difficulty,
  };
}
