import type {
  ApiErrorCode,
  Block,
  Difficulty,
  PeriodPreset,
  RankingMetric,
} from "./constants";

export type DateOnly = string & { readonly __dateOnly: unique symbol };

export type UserId = string & { readonly __userId: unique symbol };
export type DisciplineId = number & { readonly __disciplineId: unique symbol };

export type Discipline = {
  id: DisciplineId;
  name: string;
  block: Block;
  examItems: number;
  displayOrder: number;
};

export type QuestionSessionInput = {
  studyDate: DateOnly;
  disciplineId: DisciplineId;
  questionsAttempted: number;
  correctAnswers: number;
  guesses: number;
  correctGuesses: number;
  difficulty: Difficulty;
  topic: string | null;
  subtopic: string | null;
};

export type QuestionSession = QuestionSessionInput & {
  id: string;
  userId: UserId;
  createdAt: string;
};

export type DisciplineNote = {
  userId: UserId;
  disciplineId: DisciplineId;
  body: string;
  updatedAt: string;
};

export type StudyHoursInput = {
  studyDate: DateOnly;
  hours: number;
};

export type StudyHours = StudyHoursInput & {
  id: string;
  userId: UserId;
  createdAt: string;
};

export type StudiedTopicInput = {
  studyDate: DateOnly;
  disciplineId: DisciplineId;
  topic: string;
  subtopic: string | null;
};

export type StudiedTopic = StudiedTopicInput & {
  id: string;
  userId: UserId;
  createdAt: string;
};

export type StudyCycleEntry = {
  id: string;
  userId: UserId;
  disciplineId: DisciplineId;
  position: number;
  hours: number;
};

export type FilterState = {
  period: PeriodPreset;
  from: DateOnly | null;
  to: DateOnly | null;
  disciplineIds: DisciplineId[];
  metric: RankingMetric;
  minQuestions: number;
  includeSubtopics: boolean;
  week: DateOnly | null;
};

export type PageInfo = {
  page: number;
  pageSize: number;
  total: number;
  hasNextPage: boolean;
};

export type PaginatedResult<T> = {
  items: T[];
  pageInfo: PageInfo;
};

export type ApiFieldErrors = Record<string, string>;

export type ApiError = {
  error: {
    code: ApiErrorCode;
    message: string;
    fields?: ApiFieldErrors;
  };
};

export type CatalogTopic = {
  disciplineId: DisciplineId;
  topic: string;
  subtopics: string[];
};
