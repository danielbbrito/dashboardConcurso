import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lte,
  ne,
  notInArray,
  sql,
  type SQL,
} from "drizzle-orm";

import {
  computeKpis,
  type DateOnly,
  type Discipline,
  type DisciplineId,
  type DisciplineNote,
  type PaginatedResult,
  type QuestionSession,
  type QuestionSessionInput,
  type StudyCycleEntry,
  type StudyHours,
  type StudyHoursInput,
  type StudiedTopic,
  type StudiedTopicInput,
  toDateOnly,
  type UserId,
  validateCycleHours,
  validateCycleOrder,
} from "@/lib/domain";

import { db } from "./client";
import { disciplineNotes, disciplines, questionSessions, studyCycleEntries, studyHours, studiedTopics } from "./schema";

export type DateRange = { from?: DateOnly | null; to?: DateOnly | null };
export type QuestionSessionFilters = DateRange & { disciplineIds?: DisciplineId[] };
export type RepositoryQuestionRow = QuestionSession & { disciplineName: string; block: Discipline["block"] };
export type TopicAggregateRow = { topic: string; subtopic: string | null; sessions: number; attempted: number; correct: number; guesses: number; correctGuesses: number; averageDifficulty: number | null };
export type DifficultyAggregateRow = { difficulty: QuestionSession["difficulty"]; sessions: number; attempted: number; correct: number; accuracy: number | null };

const difficultyToLegacy: Record<QuestionSession["difficulty"], string> = {
  muito_facil: "Muito fácil",
  facil: "Fácil",
  medio: "Médio",
  dificil: "Difícil",
};

const difficultyFromLegacy: Record<string, QuestionSession["difficulty"]> = {
  "Muito fácil": "muito_facil",
  "Fácil": "facil",
  "Médio": "medio",
  Difícil: "dificil",
  muito_facil: "muito_facil",
  facil: "facil",
  medio: "medio",
  dificil: "dificil",
};

function mapDifficulty(value: string | null | undefined): QuestionSession["difficulty"] {
  return difficultyFromLegacy[value ?? ""] ?? "medio";
}

function questionConditions(_userId: UserId, filters: QuestionSessionFilters = {}): SQL[] {
  const conditions: SQL[] = [];
  if (filters.from) conditions.push(gte(questionSessions.studyDate, filters.from));
  if (filters.to) conditions.push(lte(questionSessions.studyDate, filters.to));
  if (filters.disciplineIds?.length) conditions.push(inArray(questionSessions.disciplineId, filters.disciplineIds));
  return conditions;
}

function topicConditions(_userId: UserId, filters: QuestionSessionFilters = {}): SQL[] {
  const conditions: SQL[] = [];
  if (filters.from) conditions.push(gte(studiedTopics.studyDate, filters.from));
  if (filters.to) conditions.push(lte(studiedTopics.studyDate, filters.to));
  if (filters.disciplineIds?.length) conditions.push(inArray(studiedTopics.disciplineId, filters.disciplineIds));
  return conditions;
}

function hoursConditions(_userId: UserId, filters: DateRange = {}): SQL[] {
  const conditions: SQL[] = [];
  if (filters.from) conditions.push(gte(studyHours.studyDate, filters.from));
  if (filters.to) conditions.push(lte(studyHours.studyDate, filters.to));
  return conditions;
}

function mapQuestion(row: {
  id: number;
  studyDate: string;
  disciplineId: number;
  questionsAttempted: number;
  correctAnswers: number;
  guesses: number;
  correctGuesses: number;
  difficulty: string | null;
  topic: string | null;
  subtopic: string | null;
  createdAt: string | null;
}, userId: UserId): QuestionSession {
  return {
    id: String(row.id),
    userId,
    studyDate: toDateOnly(row.studyDate),
    disciplineId: row.disciplineId as DisciplineId,
    questionsAttempted: row.questionsAttempted,
    correctAnswers: row.correctAnswers,
    guesses: row.guesses,
    correctGuesses: row.correctGuesses,
    difficulty: mapDifficulty(row.difficulty),
    topic: row.topic,
    subtopic: row.subtopic,
    createdAt: row.createdAt ?? "",
  };
}

export async function listDisciplines(): Promise<Discipline[]> {
  const rows = await db.select().from(disciplines).orderBy(asc(disciplines.displayOrder), asc(disciplines.id));
  return rows.map((row) => ({ id: row.id as DisciplineId, name: row.name, block: row.block as Discipline["block"], examItems: row.examItems, displayOrder: row.displayOrder }));
}

export async function getDiscipline(disciplineId: DisciplineId): Promise<Discipline | null> {
  const [row] = await db.select().from(disciplines).where(eq(disciplines.id, disciplineId));
  return row ? { id: row.id as DisciplineId, name: row.name, block: row.block as Discipline["block"], examItems: row.examItems, displayOrder: row.displayOrder } : null;
}

export async function insertDisciplines(values: Array<Omit<Discipline, "id"> & { id: DisciplineId }>): Promise<void> {
  for (const value of values) {
    await db.insert(disciplines).values({ id: value.id, name: value.name, block: value.block, examItems: value.examItems, displayOrder: value.displayOrder }).onConflictDoUpdate({
      target: disciplines.id,
      set: { name: value.name, block: value.block, examItems: value.examItems, displayOrder: value.displayOrder },
    });
  }
}

export async function recordQuestionSession(_userId: UserId, input: QuestionSessionInput): Promise<QuestionSession> {
  const [row] = await db.insert(questionSessions).values({
    studyDate: input.studyDate,
    disciplineId: input.disciplineId,
    questionsAttempted: input.questionsAttempted,
    correctAnswers: input.correctAnswers,
    guesses: input.guesses,
    correctGuesses: input.correctGuesses,
    difficulty: difficultyToLegacy[input.difficulty],
    topic: input.topic,
    subtopic: input.subtopic,
  }).returning();
  if (!row) throw new Error("Question session insert did not return a row");
  return mapQuestion(row, _userId);
}

export async function deleteQuestionSession(id: string, _userId: UserId): Promise<boolean> {
  const result = await db.delete(questionSessions).where(eq(questionSessions.id, Number(id))).returning({ id: questionSessions.id });
  return result.length > 0;
}

export async function listQuestionSessions(userId: UserId, filters: QuestionSessionFilters = {}, page = 1, pageSize = 25): Promise<PaginatedResult<RepositoryQuestionRow>> {
  const safePage = Math.max(1, Math.floor(page));
  const safePageSize = Math.min(100, Math.max(1, Math.floor(pageSize)));
  const conditions = questionConditions(userId, filters);
  const [{ total }] = await db.select({ total: count() }).from(questionSessions).where(conditions.length ? and(...conditions) : undefined);
  const rows = await db.select({
    id: questionSessions.id,
    studyDate: questionSessions.studyDate,
    disciplineId: questionSessions.disciplineId,
    questionsAttempted: questionSessions.questionsAttempted,
    correctAnswers: questionSessions.correctAnswers,
    guesses: questionSessions.guesses,
    correctGuesses: questionSessions.correctGuesses,
    difficulty: questionSessions.difficulty,
    topic: questionSessions.topic,
    subtopic: questionSessions.subtopic,
    createdAt: questionSessions.createdAt,
    disciplineName: disciplines.name,
    block: disciplines.block,
  }).from(questionSessions).innerJoin(disciplines, eq(questionSessions.disciplineId, disciplines.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(questionSessions.studyDate), desc(questionSessions.id))
    .limit(safePageSize).offset((safePage - 1) * safePageSize);
  return {
    items: rows.map((row) => ({ ...mapQuestion(row, userId), disciplineName: row.disciplineName, block: row.block as Discipline["block"] })),
    pageInfo: { page: safePage, pageSize: safePageSize, total: Number(total), hasNextPage: safePage * safePageSize < Number(total) },
  };
}

export async function listQuestionMetricRows(userId: UserId, filters: QuestionSessionFilters = {}): Promise<import("@/lib/domain").MetricQuestion[]> {
  const conditions = questionConditions(userId, filters);
  const rows = await db.select({ data: questionSessions.studyDate, disciplineId: questionSessions.disciplineId, disciplineName: disciplines.name, block: disciplines.block, attempted: questionSessions.questionsAttempted, correct: questionSessions.correctAnswers, guesses: questionSessions.guesses, correctGuesses: questionSessions.correctGuesses }).from(questionSessions).innerJoin(disciplines, eq(questionSessions.disciplineId, disciplines.id)).where(conditions.length ? and(...conditions) : undefined).orderBy(asc(questionSessions.studyDate), asc(questionSessions.id));
  return rows.map((row) => ({ ...row, data: toDateOnly(row.data), disciplineId: row.disciplineId as DisciplineId, block: row.block as Discipline["block"] }));
}

export async function aggregateQuestionsByDate(userId: UserId, filters: QuestionSessionFilters = {}): Promise<import("@/lib/domain").MetricQuestion[]> {
  const conditions = questionConditions(userId, filters);
  const rows = await db.select({ data: questionSessions.studyDate, attempted: sql<number>`coalesce(sum(${questionSessions.questionsAttempted}), 0)`, correct: sql<number>`coalesce(sum(${questionSessions.correctAnswers}), 0)`, guesses: sql<number>`coalesce(sum(${questionSessions.guesses}), 0)`, correctGuesses: sql<number>`coalesce(sum(${questionSessions.correctGuesses}), 0)` }).from(questionSessions).where(conditions.length ? and(...conditions) : undefined).groupBy(questionSessions.studyDate).orderBy(asc(questionSessions.studyDate));
  return rows.map((row) => ({ data: toDateOnly(row.data), disciplineId: 0 as DisciplineId, disciplineName: "Todas as disciplinas", block: "basico", attempted: Number(row.attempted), correct: Number(row.correct), guesses: Number(row.guesses), correctGuesses: Number(row.correctGuesses) }));
}

export async function aggregateQuestionsByDiscipline(userId: UserId, filters: QuestionSessionFilters = {}): Promise<import("@/lib/domain").MetricQuestion[]> {
  const conditions = questionConditions(userId, filters);
  const rows = await db.select({ disciplineId: questionSessions.disciplineId, disciplineName: disciplines.name, block: disciplines.block, attempted: sql<number>`coalesce(sum(${questionSessions.questionsAttempted}), 0)`, correct: sql<number>`coalesce(sum(${questionSessions.correctAnswers}), 0)`, guesses: sql<number>`coalesce(sum(${questionSessions.guesses}), 0)`, correctGuesses: sql<number>`coalesce(sum(${questionSessions.correctGuesses}), 0)` }).from(questionSessions).innerJoin(disciplines, eq(questionSessions.disciplineId, disciplines.id)).where(conditions.length ? and(...conditions) : undefined).groupBy(questionSessions.disciplineId, disciplines.name, disciplines.block).orderBy(asc(disciplines.name));
  return rows.map((row) => ({ data: toDateOnly("2000-01-01"), disciplineId: row.disciplineId as DisciplineId, disciplineName: row.disciplineName, block: row.block as Discipline["block"], attempted: Number(row.attempted), correct: Number(row.correct), guesses: Number(row.guesses), correctGuesses: Number(row.correctGuesses) }));
}

export async function aggregateTopics(userId: UserId, filters: QuestionSessionFilters = {}, includeSubtopics = false): Promise<TopicAggregateRow[]> {
  const conditions = questionConditions(userId, filters);
  const difficultyNumber = sql<number>`case ${questionSessions.difficulty} when 'Muito fácil' then 1 when 'Fácil' then 2 when 'Médio' then 3 when 'Difícil' then 4 when 'muito_facil' then 1 when 'facil' then 2 when 'medio' then 3 when 'dificil' then 4 end`;
  const rows = await db.select({ topic: questionSessions.topic, subtopic: includeSubtopics ? questionSessions.subtopic : sql<string | null>`null`, sessions: count(), attempted: sql<number>`coalesce(sum(${questionSessions.questionsAttempted}), 0)`, correct: sql<number>`coalesce(sum(${questionSessions.correctAnswers}), 0)`, guesses: sql<number>`coalesce(sum(${questionSessions.guesses}), 0)`, correctGuesses: sql<number>`coalesce(sum(${questionSessions.correctGuesses}), 0)`, averageDifficulty: sql<number | null>`avg(${difficultyNumber})` }).from(questionSessions).where(and(...conditions, isNotNull(questionSessions.topic), ne(questionSessions.topic, ""))).groupBy(questionSessions.topic, ...(includeSubtopics ? [questionSessions.subtopic] : [])).orderBy(asc(questionSessions.topic));
  return rows.map((row) => ({ topic: row.topic ?? "", subtopic: row.subtopic, sessions: Number(row.sessions), attempted: Number(row.attempted), correct: Number(row.correct), guesses: Number(row.guesses), correctGuesses: Number(row.correctGuesses), averageDifficulty: row.averageDifficulty === null ? null : Number(row.averageDifficulty) }));
}

export async function aggregateDifficulty(userId: UserId, filters: QuestionSessionFilters = {}): Promise<DifficultyAggregateRow[]> {
  const conditions = questionConditions(userId, filters);
  const rows = await db.select({ difficulty: questionSessions.difficulty, sessions: count(), attempted: sql<number>`coalesce(sum(${questionSessions.questionsAttempted}), 0)`, correct: sql<number>`coalesce(sum(${questionSessions.correctAnswers}), 0)` }).from(questionSessions).where(conditions.length ? and(...conditions) : undefined).groupBy(questionSessions.difficulty).orderBy(asc(questionSessions.difficulty));
  return rows.map((row) => ({ difficulty: mapDifficulty(row.difficulty), sessions: Number(row.sessions), attempted: Number(row.attempted), correct: Number(row.correct), accuracy: Number(row.attempted) > 0 ? Number(row.correct) / Number(row.attempted) : null }));
}

export async function aggregateQuestionKpis(userId: UserId, filters: QuestionSessionFilters = {}) {
  const conditions = questionConditions(userId, filters);
  const [row] = await db.select({ attempted: sql<number>`coalesce(sum(${questionSessions.questionsAttempted}), 0)`, correct: sql<number>`coalesce(sum(${questionSessions.correctAnswers}), 0)`, guesses: sql<number>`coalesce(sum(${questionSessions.guesses}), 0)`, correctGuesses: sql<number>`coalesce(sum(${questionSessions.correctGuesses}), 0)` }).from(questionSessions).where(conditions.length ? and(...conditions) : undefined);
  const values = row ?? { attempted: 0, correct: 0, guesses: 0, correctGuesses: 0 };
  return computeKpis([{ data: toDateOnly("2000-01-01"), disciplineId: 0 as DisciplineId, disciplineName: "", block: "basico", attempted: Number(values.attempted), correct: Number(values.correct), guesses: Number(values.guesses), correctGuesses: Number(values.correctGuesses) }]);
}

export async function getDisciplineNote(userId: UserId, disciplineId: DisciplineId): Promise<DisciplineNote | null> {
  const [row] = await db.select().from(disciplineNotes).where(eq(disciplineNotes.disciplineId, disciplineId));
  return row ? { userId, disciplineId: row.disciplineId as DisciplineId, body: row.body, updatedAt: row.updatedAt ?? "" } : null;
}

export async function upsertDisciplineNote(userId: UserId, disciplineId: DisciplineId, body: string): Promise<DisciplineNote> {
  const [existing] = await db.select().from(disciplineNotes).where(eq(disciplineNotes.disciplineId, disciplineId));
  const [row] = existing
    ? await db.update(disciplineNotes).set({ body, updatedAt: sql`datetime('now')` }).where(eq(disciplineNotes.disciplineId, disciplineId)).returning()
    : await db.insert(disciplineNotes).values({ disciplineId, body, updatedAt: sql`datetime('now')` }).returning();
  if (!row) throw new Error("Discipline note upsert did not return a row");
  return { userId, disciplineId: row.disciplineId as DisciplineId, body: row.body, updatedAt: row.updatedAt ?? "" };
}

export async function recordStudyHours(userId: UserId, input: StudyHoursInput): Promise<StudyHours> {
  const [row] = await db.insert(studyHours).values({ studyDate: input.studyDate, hours: input.hours }).returning();
  if (!row) throw new Error("Study hours insert did not return a row");
  return { id: String(row.id), userId, studyDate: toDateOnly(row.studyDate), hours: row.hours, createdAt: row.createdAt ?? "" };
}

export async function listStudyHours(userId: UserId, filters: DateRange = {}, page = 1, pageSize = 25): Promise<PaginatedResult<StudyHours>> {
  const safePage = Math.max(1, Math.floor(page));
  const safePageSize = Math.min(100, Math.max(1, Math.floor(pageSize)));
  const conditions = hoursConditions(userId, filters);
  const [{ total }] = await db.select({ total: count() }).from(studyHours).where(conditions.length ? and(...conditions) : undefined);
  const rows = await db.select().from(studyHours).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(studyHours.studyDate), desc(studyHours.id)).limit(safePageSize).offset((safePage - 1) * safePageSize);
  return { items: rows.map((row) => ({ id: String(row.id), userId, studyDate: toDateOnly(row.studyDate), hours: row.hours, createdAt: row.createdAt ?? "" })), pageInfo: { page: safePage, pageSize: safePageSize, total: Number(total), hasNextPage: safePage * safePageSize < Number(total) } };
}

export async function deleteStudyHours(id: string, _userId: UserId): Promise<boolean> {
  const result = await db.delete(studyHours).where(eq(studyHours.id, Number(id))).returning({ id: studyHours.id });
  return result.length > 0;
}

export async function aggregateStudyHoursByDate(userId: UserId, filters: DateRange = {}) {
  const conditions = hoursConditions(userId, filters);
  return db.select({ data: studyHours.studyDate, hours: sql<number>`sum(${studyHours.hours})` }).from(studyHours).where(conditions.length ? and(...conditions) : undefined).groupBy(studyHours.studyDate).orderBy(asc(studyHours.studyDate));
}

export async function recordStudiedTopic(userId: UserId, input: StudiedTopicInput): Promise<StudiedTopic> {
  const [row] = await db.insert(studiedTopics).values({ studyDate: input.studyDate, disciplineId: input.disciplineId, topic: input.topic, subtopic: input.subtopic }).returning();
  if (!row) throw new Error("Studied topic insert did not return a row");
  return { id: String(row.id), userId, studyDate: toDateOnly(row.studyDate), disciplineId: row.disciplineId as DisciplineId, topic: row.topic, subtopic: row.subtopic, createdAt: row.createdAt ?? "" };
}

export async function listStudiedTopics(userId: UserId, filters: QuestionSessionFilters = {}, page = 1, pageSize = 25): Promise<PaginatedResult<StudiedTopic & { disciplineName: string }>> {
  const safePage = Math.max(1, Math.floor(page));
  const safePageSize = Math.min(100, Math.max(1, Math.floor(pageSize)));
  const conditions = topicConditions(userId, filters);
  const [{ total }] = await db.select({ total: count() }).from(studiedTopics).where(conditions.length ? and(...conditions) : undefined);
  const rows = await db.select({ id: studiedTopics.id, studyDate: studiedTopics.studyDate, disciplineId: studiedTopics.disciplineId, topic: studiedTopics.topic, subtopic: studiedTopics.subtopic, createdAt: studiedTopics.createdAt, disciplineName: disciplines.name }).from(studiedTopics).innerJoin(disciplines, eq(studiedTopics.disciplineId, disciplines.id)).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(studiedTopics.studyDate), desc(studiedTopics.id)).limit(safePageSize).offset((safePage - 1) * safePageSize);
  return { items: rows.map((row) => ({ id: String(row.id), userId, studyDate: toDateOnly(row.studyDate), disciplineId: row.disciplineId as DisciplineId, topic: row.topic, subtopic: row.subtopic, createdAt: row.createdAt ?? "", disciplineName: row.disciplineName })), pageInfo: { page: safePage, pageSize: safePageSize, total: Number(total), hasNextPage: safePage * pageSize < Number(total) } };
}

export async function deleteStudiedTopic(id: string, _userId: UserId): Promise<boolean> {
  const result = await db.delete(studiedTopics).where(eq(studiedTopics.id, Number(id))).returning({ id: studiedTopics.id });
  return result.length > 0;
}

export async function listStudyCycle(userId: UserId): Promise<StudyCycleEntry[]> {
  const rows = await db.select().from(studyCycleEntries).orderBy(asc(studyCycleEntries.position));
  return rows.map((row) => ({ id: String(row.id), userId, disciplineId: row.disciplineId as DisciplineId, position: row.position, hours: row.hours }));
}

export async function saveStudyCycleOrder(userId: UserId, disciplineIds: DisciplineId[]): Promise<void> {
  await db.transaction(async (tx) => {
    const knownRows = await tx.select({ id: disciplines.id }).from(disciplines);
    const validation = validateCycleOrder(disciplineIds, knownRows.map((row) => row.id as DisciplineId));
    if (!validation.success) throw new Error(validation.error.error.message);
    const existing = await tx.select().from(studyCycleEntries);
    const hoursByDiscipline = new Map(existing.map((row) => [row.disciplineId, row.hours]));
    await tx.delete(studyCycleEntries);
    for (const [index, disciplineId] of disciplineIds.entries()) {
      await tx.insert(studyCycleEntries).values({ disciplineId, position: index + 1, hours: hoursByDiscipline.get(disciplineId) ?? 1 });
    }
  });
}

export async function saveStudyCycleHours(_userId: UserId, hoursByDiscipline: Record<string, number>): Promise<void> {
  const validation = validateCycleHours(hoursByDiscipline);
  if (!validation.success) throw new Error(validation.error.error.message);
  await db.transaction(async (tx) => {
    const known = new Set((await tx.select({ id: disciplines.id }).from(disciplines)).map((row) => row.id));
    const existing = await tx.select().from(studyCycleEntries);
    let nextPosition = Math.max(0, ...existing.map((row) => row.position)) + 1;
    for (const [disciplineIdText, hours] of Object.entries(validation.data)) {
      const disciplineId = Number(disciplineIdText);
      if (!known.has(disciplineId)) throw new Error("A ordem contem uma disciplina desconhecida.");
      const current = existing.find((row) => row.disciplineId === disciplineId);
      if (current) await tx.update(studyCycleEntries).set({ hours }).where(eq(studyCycleEntries.id, current.id));
      else await tx.insert(studyCycleEntries).values({ disciplineId, position: nextPosition++, hours });
    }
  });
}
