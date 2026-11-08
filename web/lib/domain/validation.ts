import {
  DEFAULT_PAGE_SIZE,
  DIFFICULTIES,
  isDifficulty,
  isPeriodPreset,
  isRankingMetric,
  MAX_PAGE_SIZE,
  type Difficulty,
} from "./constants";
import { isDateOnly, todayDateOnly } from "./date-only";
import type {
  ApiError,
  ApiFieldErrors,
  DateOnly,
  DisciplineId,
  FilterState,
  QuestionSessionInput,
  StudyHoursInput,
  StudiedTopicInput,
} from "./types";

export const MAX_HOURS = 24;
export const MAX_CYCLE_HOURS = 60;
export const MAX_TEXT_LENGTH = 200;
export const MAX_HOURS_DECIMAL_PLACES = 2;

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError };

export class DomainValidationError extends Error {
  readonly fields: ApiFieldErrors;

  constructor(message: string, fields: ApiFieldErrors) {
    super(message);
    this.name = "DomainValidationError";
    this.fields = fields;
  }

  toApiError(): ApiError {
    return {
      error: {
        code: "VALIDATION_ERROR",
        message: this.message,
        fields: this.fields,
      },
    };
  }
}

function invalid<T>(fields: ApiFieldErrors): ValidationResult<T> {
  const error = new DomainValidationError("Revise os campos destacados.", fields);
  return { success: false, error: error.toApiError() };
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && Number.isFinite(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isFutureDate(value: DateOnly, today: DateOnly): boolean {
  return value > today;
}

function textOrNull(value: unknown, field: string, fields: ApiFieldErrors, maxLength = MAX_TEXT_LENGTH): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") {
    fields[field] = "Informe um texto valido.";
    return null;
  }
  const text = value.trim();
  if (text.length > maxLength) {
    fields[field] = `Use no maximo ${maxLength} caracteres.`;
  }
  return text || null;
}

function disciplineIdOrError(value: unknown, field: string, fields: ApiFieldErrors): DisciplineId | null {
  if (!isInteger(value) || value < 1) {
    fields[field] = "Selecione uma disciplina valida.";
    return null;
  }
  return value as DisciplineId;
}

export function validateQuestionSession(
  value: unknown,
  options: { today?: DateOnly; allowLegacyTextLength?: boolean } = {},
): ValidationResult<QuestionSessionInput> {
  const input = objectValue(value);
  const fields: ApiFieldErrors = {};
  const today = options.today ?? todayDateOnly();
  if (!input) return invalid({ form: "Informe os dados da sessao." });

  const studyDate = input.studyDate;
  if (!isDateOnly(studyDate)) fields.studyDate = "Informe uma data valida.";
  else if (isFutureDate(studyDate, today)) fields.studyDate = "A data nao pode ser futura.";

  const disciplineId = disciplineIdOrError(input.disciplineId, "disciplineId", fields);
  const attempted = input.questionsAttempted;
  const correct = input.correctAnswers;
  const guesses = input.guesses;
  const correctGuesses = input.correctGuesses;
  if (!isInteger(attempted) || attempted < 1) fields.questionsAttempted = "Informe ao menos uma questao.";
  if (!isInteger(correct)) fields.correctAnswers = "Use um numero inteiro.";
  if (!isInteger(guesses)) fields.guesses = "Use um numero inteiro.";
  if (!isInteger(correctGuesses)) fields.correctGuesses = "Use um numero inteiro.";
  if (isInteger(attempted) && isInteger(correct) && (correct < 0 || correct > attempted)) {
    fields.correctAnswers = "Deve estar entre 0 e o total de questoes.";
  }
  if (isInteger(attempted) && isInteger(guesses) && (guesses < 0 || guesses > attempted)) {
    fields.guesses = "Deve estar entre 0 e o total de questoes.";
  }
  if (isInteger(guesses) && isInteger(correctGuesses) && (correctGuesses < 0 || correctGuesses > guesses)) {
    fields.correctGuesses = "Nao pode ser maior que os chutes.";
  }
  if (isInteger(correct) && isInteger(correctGuesses) && correctGuesses > correct) {
    fields.correctGuesses = "Nao pode ser maior que os acertos.";
  }

  const difficulty = input.difficulty;
  if (!isDifficulty(difficulty)) fields.difficulty = `Escolha uma dificuldade: ${DIFFICULTIES.join(", ")}.`;
  const maxTextLength = options.allowLegacyTextLength ? Number.POSITIVE_INFINITY : MAX_TEXT_LENGTH;
  const topic = textOrNull(input.topic, "topic", fields, maxTextLength);
  const subtopic = textOrNull(input.subtopic, "subtopic", fields, maxTextLength);
  if (!topic && subtopic) fields.subtopic = "Selecione uma materia antes do subtopico.";
  if (Object.keys(fields).length > 0 || disciplineId === null || !isDateOnly(studyDate) || !isDifficulty(difficulty)) {
    return invalid(fields);
  }

  const validAttempted = attempted as number;
  const validCorrect = correct as number;
  const validGuesses = guesses as number;
  const validCorrectGuesses = correctGuesses as number;
  const validDifficulty = difficulty as Difficulty;

  return {
    success: true,
    data: {
      studyDate,
      disciplineId,
      questionsAttempted: validAttempted,
      correctAnswers: validCorrect,
      guesses: validGuesses,
      correctGuesses: validCorrectGuesses,
      difficulty: validDifficulty,
      topic,
      subtopic,
    },
  };
}

export function validateStudyHours(
  value: unknown,
  options: { today?: DateOnly; allowLegacyPrecision?: boolean } = {},
): ValidationResult<StudyHoursInput> {
  const input = objectValue(value);
  const fields: ApiFieldErrors = {};
  const today = options.today ?? todayDateOnly();
  if (!input) return invalid({ form: "Informe os dados das horas." });
  if (!isDateOnly(input.studyDate)) fields.studyDate = "Informe uma data valida.";
  else if (isFutureDate(input.studyDate, today)) fields.studyDate = "A data nao pode ser futura.";
  if (!isFiniteNumber(input.hours)) fields.hours = "Informe um numero de horas.";
  else {
    if (input.hours <= 0 || input.hours > MAX_HOURS) fields.hours = "Informe um valor entre 0 e 24 horas.";
    const decimalPlaces = String(input.hours).split(".")[1]?.length ?? 0;
    if (!options.allowLegacyPrecision && decimalPlaces > MAX_HOURS_DECIMAL_PLACES) fields.hours = "Use no maximo duas casas decimais.";
  }
  if (Object.keys(fields).length > 0 || !isDateOnly(input.studyDate) || !isFiniteNumber(input.hours)) {
    return invalid(fields);
  }
  return { success: true, data: { studyDate: input.studyDate, hours: input.hours } };
}

export function validateStudiedTopic(
  value: unknown,
  options: { today?: DateOnly } = {},
): ValidationResult<StudiedTopicInput> {
  const input = objectValue(value);
  const fields: ApiFieldErrors = {};
  const today = options.today ?? todayDateOnly();
  if (!input) return invalid({ form: "Informe os dados da materia estudada." });
  if (!isDateOnly(input.studyDate)) fields.studyDate = "Informe uma data valida.";
  else if (isFutureDate(input.studyDate, today)) fields.studyDate = "A data nao pode ser futura.";
  const disciplineId = disciplineIdOrError(input.disciplineId, "disciplineId", fields);
  const topic = typeof input.topic === "string" ? input.topic.trim() : "";
  if (!topic) fields.topic = "Informe a materia estudada.";
  else if (topic.length > MAX_TEXT_LENGTH) fields.topic = `Use no maximo ${MAX_TEXT_LENGTH} caracteres.`;
  const subtopic = textOrNull(input.subtopic, "subtopic", fields);
  if (Object.keys(fields).length > 0 || disciplineId === null || !isDateOnly(input.studyDate)) {
    return invalid(fields);
  }
  return { success: true, data: { studyDate: input.studyDate, disciplineId, topic, subtopic } };
}

export function validateFilters(value: unknown): ValidationResult<FilterState> {
  const input = objectValue(value);
  const fields: ApiFieldErrors = {};
  if (!input) return invalid({ form: "Informe filtros validos." });
  if (!isPeriodPreset(input.period)) fields.period = "Informe um periodo valido.";
  if (input.from !== null && input.from !== undefined && !isDateOnly(input.from)) fields.from = "Informe uma data inicial valida.";
  if (input.to !== null && input.to !== undefined && !isDateOnly(input.to)) fields.to = "Informe uma data final valida.";
  if (isDateOnly(input.from) && isDateOnly(input.to) && input.from > input.to) {
    fields.to = "A data final deve ser igual ou posterior a inicial.";
  }
  if (!Array.isArray(input.disciplineIds) || !input.disciplineIds.every((id) => isInteger(id) && id > 0)) {
    fields.disciplineIds = "Informe disciplinas validas.";
  } else if (new Set(input.disciplineIds).size !== input.disciplineIds.length) {
    fields.disciplineIds = "Nao repita disciplinas no filtro.";
  }
  if (!isInteger(input.minQuestions) || input.minQuestions < 0) fields.minQuestions = "Informe um limite inteiro nao negativo.";
  if (input.week !== undefined && input.week !== null && !isDateOnly(input.week)) fields.week = "Informe uma semana valida.";
  if (!isRankingMetric(input.metric)) fields.metric = "Informe uma metrica valida.";
  if (Object.keys(fields).length > 0 || !isPeriodPreset(input.period)) return invalid(fields);
  const from = input.from === undefined || input.from === null ? null : (input.from as DateOnly);
  const to = input.to === undefined || input.to === null ? null : (input.to as DateOnly);
  const week = input.week === undefined || input.week === null ? null : (input.week as DateOnly);
  const metric = input.metric as FilterState["metric"];
  const minQuestions = input.minQuestions as number;
  return {
    success: true,
    data: {
      period: input.period,
      from,
      to,
      disciplineIds: input.disciplineIds as DisciplineId[],
      metric,
      minQuestions: Math.min(minQuestions, 1_000_000),
      includeSubtopics: input.includeSubtopics === true,
      week,
    },
  };
}

export function validatePageSize(value: unknown): number {
  if (!isInteger(value) || value < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(value, MAX_PAGE_SIZE);
}

export function validateCycleOrder(value: unknown, knownDisciplineIds: DisciplineId[]): ValidationResult<DisciplineId[]> {
  if (!Array.isArray(value) || !value.every((id) => isInteger(id) && id > 0)) {
    return invalid({ order: "Informe uma ordem de disciplinas valida." });
  }
  const known = new Set(knownDisciplineIds);
  const unknown = value.some((id) => !known.has(id as DisciplineId));
  if (unknown) return invalid({ order: "A ordem contem uma disciplina desconhecida." });
  if (new Set(value).size !== value.length) return invalid({ order: "A ordem nao pode conter disciplinas repetidas." });
  return { success: true, data: value as DisciplineId[] };
}

export function validateCycleHours(value: unknown): ValidationResult<Record<string, number>> {
  const input = objectValue(value);
  const fields: ApiFieldErrors = {};
  if (!input) return invalid({ hours: "Informe as horas do ciclo." });
  for (const [disciplineId, hours] of Object.entries(input)) {
    if (!isFiniteNumber(hours) || hours <= 0 || hours > MAX_CYCLE_HOURS) {
      fields[disciplineId] = `Informe um valor maior que 0 e menor ou igual a ${MAX_CYCLE_HOURS}.`;
      continue;
    }
    if ((String(hours).split(".")[1]?.length ?? 0) > MAX_HOURS_DECIMAL_PLACES) {
      fields[disciplineId] = "Use no maximo duas casas decimais.";
    }
  }
  if (Object.keys(fields).length > 0) return invalid(fields);
  return { success: true, data: input as Record<string, number> };
}
