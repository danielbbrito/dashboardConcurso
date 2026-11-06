import "server-only";

import { subtopicsForTopic } from "@/lib/catalog";
import { type AuthorizedUser } from "@/lib/authorization";
import { ensureApplicationUser } from "@/lib/application-user";
import {
  getDiscipline,
  recordQuestionSession,
  recordStudyHours,
  recordStudiedTopic,
} from "@/lib/db/repository";
import {
  computeKpis,
  type DisciplineId,
  type QuestionSessionInput,
  type StudyHoursInput,
  type StudiedTopicInput,
  validateQuestionSession,
  validateStudyHours,
  validateStudiedTopic,
} from "@/lib/domain";

export async function saveQuestionSession(user: AuthorizedUser, value: unknown, today: import("@/lib/domain").DateOnly) {
  const validation = validateQuestionSession(value, { today });
  if (!validation.success) return validation;
  const discipline = await getDiscipline(validation.data.disciplineId);
  if (!discipline) {
    return { success: false as const, error: { error: { code: "VALIDATION_ERROR" as const, message: "Revise os campos destacados.", fields: { disciplineId: "A disciplina selecionada não existe." } } } };
  }
  if (validation.data.subtopic && validation.data.topic && subtopicsForTopic(discipline.id, validation.data.topic).length > 0 && !subtopicsForTopic(discipline.id, validation.data.topic).includes(validation.data.subtopic)) {
    return { success: false as const, error: { error: { code: "VALIDATION_ERROR" as const, message: "Revise os campos destacados.", fields: { subtopic: "O subtópico não pertence à matéria selecionada." } } } };
  }
  const userId = await ensureApplicationUser(user);
  const session = await recordQuestionSession(userId, validation.data);
  const kpis = computeKpis([{
    data: session.studyDate,
    disciplineId: session.disciplineId,
    disciplineName: discipline.name,
    block: discipline.block,
    attempted: session.questionsAttempted,
    correct: session.correctAnswers,
    guesses: session.guesses,
    correctGuesses: session.correctGuesses,
  }]);
  return { success: true as const, data: { session, summary: { accuracy: kpis.accuracy, netScore: kpis.netScore } } };
}

export async function saveStudyHours(user: AuthorizedUser, value: unknown, today: import("@/lib/domain").DateOnly) {
  const validation = validateStudyHours(value, { today });
  if (!validation.success) return validation;
  const userId = await ensureApplicationUser(user);
  return { success: true as const, data: await recordStudyHours(userId, validation.data) };
}

export async function saveStudiedTopic(user: AuthorizedUser, value: unknown, today: import("@/lib/domain").DateOnly) {
  const validation = validateStudiedTopic(value, { today });
  if (!validation.success) return validation;
  const discipline = await getDiscipline(validation.data.disciplineId);
  if (!discipline) {
    return { success: false as const, error: { error: { code: "VALIDATION_ERROR" as const, message: "Revise os campos destacados.", fields: { disciplineId: "A disciplina selecionada não existe." } } } };
  }
  const userId = await ensureApplicationUser(user);
  return { success: true as const, data: await recordStudiedTopic(userId, validation.data) };
}
