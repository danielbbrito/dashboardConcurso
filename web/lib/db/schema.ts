import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  providerSubject: text("provider_subject").notNull().unique(),
  email: text("email").notNull().unique(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  lastLoginAt: text("last_login_at"),
});

export const disciplines = sqliteTable(
  "disciplines",
  {
    id: integer("id").primaryKey(),
    name: text("name").notNull().unique(),
    block: text("block").notNull(),
    examItems: integer("exam_items").notNull(),
    displayOrder: integer("display_order").notNull().default(0),
  },
  (table) => [
    check("disciplines_block_check", sql`${table.block} IN ('basico', 'especifico')`),
    check("disciplines_exam_items_check", sql`${table.examItems} > 0`),
  ],
);

export const questionSessions = sqliteTable(
  "question_sessions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    studyDate: text("study_date").notNull(),
    disciplineId: integer("discipline_id").notNull().references(() => disciplines.id),
    questionsAttempted: integer("questions_attempted").notNull(),
    correctAnswers: integer("correct_answers").notNull(),
    guesses: integer("guesses").notNull().default(0),
    correctGuesses: integer("correct_guesses").notNull().default(0),
    difficulty: text("difficulty").notNull(),
    topic: text("topic"),
    subtopic: text("subtopic"),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  },
  (table) => [
    check("question_sessions_attempted_check", sql`${table.questionsAttempted} >= 1`),
    check("question_sessions_correct_check", sql`${table.correctAnswers} BETWEEN 0 AND ${table.questionsAttempted}`),
    check("question_sessions_guesses_check", sql`${table.guesses} BETWEEN 0 AND ${table.questionsAttempted}`),
    check("question_sessions_correct_guesses_check", sql`${table.correctGuesses} BETWEEN 0 AND ${table.guesses}`),
    check("question_sessions_correct_guess_answers_check", sql`${table.correctGuesses} <= ${table.correctAnswers}`),
    check("question_sessions_difficulty_check", sql`${table.difficulty} IN ('muito_facil', 'facil', 'medio', 'dificil')`),
    check("question_sessions_subtopic_check", sql`${table.topic} IS NOT NULL OR ${table.subtopic} IS NULL`),
    index("question_sessions_user_date_idx").on(table.userId, table.studyDate),
    index("question_sessions_user_discipline_date_idx").on(table.userId, table.disciplineId, table.studyDate),
    index("question_sessions_user_topic_date_idx").on(table.userId, table.topic, table.studyDate),
  ],
);

export const disciplineNotes = sqliteTable(
  "discipline_notes",
  {
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    disciplineId: integer("discipline_id").notNull().references(() => disciplines.id, { onDelete: "cascade" }),
    body: text("body").notNull().default(""),
    updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
  },
  (table) => [primaryKey({ columns: [table.userId, table.disciplineId] })],
);

export const studyHours = sqliteTable(
  "study_hours",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    studyDate: text("study_date").notNull(),
    hours: real("hours").notNull(),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  },
  (table) => [
    check("study_hours_range_check", sql`${table.hours} > 0 AND ${table.hours} <= 24`),
    index("study_hours_user_date_idx").on(table.userId, table.studyDate),
  ],
);

export const studiedTopics = sqliteTable(
  "studied_topics",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    studyDate: text("study_date").notNull(),
    disciplineId: integer("discipline_id").notNull().references(() => disciplines.id),
    topic: text("topic").notNull(),
    subtopic: text("subtopic"),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  },
  (table) => [
    check("studied_topics_topic_check", sql`length(trim(${table.topic})) > 0`),
    index("studied_topics_user_date_idx").on(table.userId, table.studyDate),
    index("studied_topics_user_discipline_date_idx").on(table.userId, table.disciplineId, table.studyDate),
  ],
);

export const studyCycleEntries = sqliteTable(
  "study_cycle_entries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    disciplineId: integer("discipline_id").notNull().references(() => disciplines.id),
    position: integer("position").notNull(),
    hours: real("hours").notNull(),
  },
  (table) => [
    check("study_cycle_hours_check", sql`${table.hours} > 0 AND ${table.hours} <= 60`),
    uniqueIndex("study_cycle_user_position_idx").on(table.userId, table.position),
    uniqueIndex("study_cycle_user_discipline_idx").on(table.userId, table.disciplineId),
  ],
);

export const disciplineRelations = relations(disciplines, ({ many }) => ({
  questionSessions: many(questionSessions),
  studiedTopics: many(studiedTopics),
  cycleEntries: many(studyCycleEntries),
}));

export const userRelations = relations(users, ({ many }) => ({
  questionSessions: many(questionSessions),
  notes: many(disciplineNotes),
  studyHours: many(studyHours),
  studiedTopics: many(studiedTopics),
  cycleEntries: many(studyCycleEntries),
}));
