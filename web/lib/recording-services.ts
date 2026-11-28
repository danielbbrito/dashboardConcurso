import "server-only";

import { subtopicsForTopic } from "@/lib/catalog";
import { type AuthorizedUser } from "@/lib/authorization";
import { ensureApplicationUser } from "@/lib/application-user";
import {
  getDiscipline,
  recordQuestionSession,
  recordStudyHours,
  recordStudiedTopic,
  updateQuestionSession,
  updateStudiedTopic,
} from "@/lib/db/repository";
import {
  computeKpis,
  type DateOnly,
  type Discipline,
  type QuestionSessionInput,
  type StudyHoursInput,
  validateQuestionSession,
  validateStudyHours,
  validateStudiedTopic,
} from "@/lib/domain";

type ValidatedQuestionSession = { input: QuestionSessionInput; discipline: Discipline };

async function validateQuestionRecord(value: unknown, today: DateOnly) {
  const validation = validateQuestionSession(value, { today });
  if (!validation.success) return validation;
  const discipline = await getDiscipline(validation.data.disciplineId);
  if (!discipline) {
    return { success: false as const, error: { error: { code: "VALIDATION_ERROR" as const, message: "Revise os campos destacados.", fields: { disciplineId: "A disciplina selecionada não existe." } } } };
  }
  if (validation.data.subtopic && validation.data.topic && subtopicsForTopic(discipline.id, validation.data.topic).length > 0 && !subtopicsForTopic(discipline.id, validation.data.topic).includes(validation.data.subtopic)) {
    return { success: false as const, error: { error: { code: "VALIDATION_ERROR" as const, message: "Revise os campos destacados.", fields: { subtopic: "O subtópico não pertence à matéria selecionada." } } } };
  }
  return { success: true as const, data: { input: validation.data, discipline } satisfies ValidatedQuestionSession };
}

export async function saveQuestionSession(user: AuthorizedUser, value: unknown, today: DateOnly) {
  const validation = await validateQuestionRecord(value, today);
  if (!validation.success) return validation;
  const userId = await ensureApplicationUser(user);
  const session = await recordQuestionSession(userId, validation.data.input);
  const kpis = computeKpis([{
    data: session.studyDate,
    disciplineId: session.disciplineId,
    disciplineName: validation.data.discipline.name,
    block: validation.data.discipline.block,
    attempted: session.questionsAttempted,
    correct: session.correctAnswers,
    guesses: session.guesses,
    correctGuesses: session.correctGuesses,
  }]);
  return { success: true as const, data: { session, summary: { accuracy: kpis.accuracy } } };
}

export async function editQuestionSession(user: AuthorizedUser, id: string, value: unknown, today: DateOnly) {
  const validation = await validateQuestionRecord(value, today);
  if (!validation.success) return validation;
  const userId = await ensureApplicationUser(user);
  return { success: true as const, data: await updateQuestionSession(id, userId, validation.data.input) };
}

export async function saveStudyHours(user: AuthorizedUser, value: unknown, today: DateOnly) {
  const validation = validateStudyHours(value, { today });
  if (!validation.success) return validation;
  const userId = await ensureApplicationUser(user);
  return { success: true as const, data: await recordStudyHours(userId, validation.data) };
}

async function validateStudiedTopicRecord(value: unknown, today: DateOnly) {
  const validation = validateStudiedTopic(value, { today });
  if (!validation.success) return validation;
  if (!await getDiscipline(validation.data.disciplineId)) {
    return { success: false as const, error: { error: { code: "VALIDATION_ERROR" as const, message: "Revise os campos destacados.", fields: { disciplineId: "A disciplina selecionada não existe." } } } };
  }
  return validation;
}

export async function saveStudiedTopic(user: AuthorizedUser, value: unknown, today: DateOnly) {
  const validation = await validateStudiedTopicRecord(value, today);
  if (!validation.success) return validation;
  const userId = await ensureApplicationUser(user);
  return { success: true as const, data: await recordStudiedTopic(userId, validation.data) };
}

export async function editStudiedTopic(user: AuthorizedUser, id: string, value: unknown, today: DateOnly) {
  const validation = await validateStudiedTopicRecord(value, today);
  if (!validation.success) return validation;
  const userId = await ensureApplicationUser(user);
  return { success: true as const, data: await updateStudiedTopic(id, userId, validation.data) };
}
