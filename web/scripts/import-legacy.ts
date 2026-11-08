import { createClient, type InStatement } from "@libsql/client";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import {
  toDateOnly,
  validateQuestionSession,
  validateStudiedTopic,
  validateStudyHours,
  type DateOnly,
  type DisciplineId,
} from "../lib/domain";
import { runMigrations } from "../lib/db/migrate";

const execFileAsync = promisify(execFile);
type Row = Record<string, unknown>;

async function sourceQuery(source: string, sql: string): Promise<Row[]> {
  const { stdout } = await execFileAsync("sqlite3", ["-readonly", "-json", source, sql]);
  return JSON.parse(stdout || "[]") as Row[];
}

function argument(name: string, fallback?: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function sourceDifficulty(value: unknown): string {
  return ({ "Muito fácil": "muito_facil", "Fácil": "facil", "Médio": "medio", "Difícil": "dificil" } as Record<string, string>)[String(value)] ?? "medio";
}

function batchStatement(sql: string, args: Array<string | number | null>): InStatement {
  return { sql, args };
}

async function main(): Promise<void> {
  const source = path.resolve(argument("--source", "../data/estudos.db") as string);
  const targetUrl = argument("--target");
  const ownerEmail = (argument("--owner-email", process.env.MIGRATION_OWNER_EMAIL) ?? "").trim().toLowerCase();
  const validationDate = toDateOnly(argument("--today", "2026-10-21") as string);
  if (!targetUrl) throw new Error("--target is required for fixture migration");
  if (!ownerEmail) throw new Error("MIGRATION_OWNER_EMAIL or --owner-email is required");
  if (path.resolve(source) === path.resolve(targetUrl.replace(/^file:/, ""))) throw new Error("Source and target must be different");

  const migrationSql = await readFile(path.resolve("migrations/0001_initial.sql"), "utf8");
  const target = createClient({ url: targetUrl, authToken: process.env.DATABASE_AUTH_TOKEN ?? process.env.ESTUDOS_DB_TOKEN });
  await runMigrations(target, [{ id: "0001_initial", sql: migrationSql }]);

  const disciplines = await sourceQuery(source, "SELECT id, nome, bloco, itens_prova, ordem FROM disciplinas ORDER BY id");
  const disciplineIds = new Set(disciplines.map((row) => Number(row.id)));
  const registrationColumns = new Set((await sourceQuery(source, 'PRAGMA table_info("registros")')).map((row) => String(row.name)));
  const registrations = await sourceQuery(source, "SELECT * FROM registros ORDER BY id");
  const hours = await sourceQuery(source, "SELECT * FROM horas_estudo ORDER BY id");
  const topics = await sourceQuery(source, "SELECT * FROM materias ORDER BY id");
  const notes = await sourceQuery(source, "SELECT * FROM anotacoes ORDER BY disciplina_id");
  const cycle = await sourceQuery(source, "SELECT * FROM ciclo_estudos ORDER BY posicao");
  const statements: InStatement[] = [];
  const userId = `migration:${ownerEmail}`;
  statements.push(batchStatement(
    "INSERT INTO users (id, provider_subject, email) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET provider_subject = excluded.provider_subject, email = excluded.email",
    [userId, `migration:${ownerEmail}`, ownerEmail],
  ));
  for (const row of disciplines) {
    statements.push(batchStatement(
      "INSERT INTO disciplines (id, name, block, exam_items, display_order) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, block = excluded.block, exam_items = excluded.exam_items, display_order = excluded.display_order",
      [Number(row.id), String(row.nome), String(row.bloco), Number(row.itens_prova), Number(row.ordem)],
    ));
  }
  for (const row of registrations) {
    const disciplineId = Number(row.disciplina_id) as DisciplineId;
    const result = validateQuestionSession({
      studyDate: row.data,
      disciplineId,
      questionsAttempted: Number(row.feitas),
      correctAnswers: Number(row.acertos),
      guesses: Number(row.chutes),
      correctGuesses: Number(row.chutes_certos),
      difficulty: registrationColumns.has("dificuldade") ? sourceDifficulty(row.dificuldade) : "medio",
      topic: registrationColumns.has("materia") ? row.materia ?? null : null,
      subtopic: registrationColumns.has("submateria") ? row.submateria ?? null : null,
    }, { today: validationDate, allowLegacyTextLength: true });
    if (!disciplineIds.has(disciplineId) || !result.success) throw new Error(`Invalid registros row ${String(row.id)}`);
    const mapped = result.data;
    statements.push(batchStatement(
      "INSERT INTO question_sessions (id, user_id, study_date, discipline_id, questions_attempted, correct_answers, guesses, correct_guesses, difficulty, topic, subtopic) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET user_id = excluded.user_id, study_date = excluded.study_date, discipline_id = excluded.discipline_id, questions_attempted = excluded.questions_attempted, correct_answers = excluded.correct_answers, guesses = excluded.guesses, correct_guesses = excluded.correct_guesses, difficulty = excluded.difficulty, topic = excluded.topic, subtopic = excluded.subtopic",
      [Number(row.id), userId, mapped.studyDate, mapped.disciplineId, mapped.questionsAttempted, mapped.correctAnswers, mapped.guesses, mapped.correctGuesses, mapped.difficulty, mapped.topic, mapped.subtopic],
    ));
  }
  for (const row of hours) {
    const result = validateStudyHours({ studyDate: row.data, hours: Number(row.horas) }, { today: validationDate, allowLegacyPrecision: true });
    if (!result.success) throw new Error(`Invalid horas_estudo row ${String(row.id)}`);
    statements.push(batchStatement(
      "INSERT INTO study_hours (id, user_id, study_date, hours) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET user_id = excluded.user_id, study_date = excluded.study_date, hours = excluded.hours",
      [Number(row.id), userId, result.data.studyDate, result.data.hours],
    ));
  }
  for (const row of topics) {
    const disciplineId = Number(row.disciplina_id) as DisciplineId;
    const result = validateStudiedTopic({ studyDate: row.data, disciplineId, topic: row.materia, subtopic: row.submateria ?? null }, { today: validationDate });
    if (!disciplineIds.has(disciplineId) || !result.success) throw new Error(`Invalid materias row ${String(row.id)}`);
    statements.push(batchStatement(
      "INSERT INTO studied_topics (id, user_id, study_date, discipline_id, topic, subtopic) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET user_id = excluded.user_id, study_date = excluded.study_date, discipline_id = excluded.discipline_id, topic = excluded.topic, subtopic = excluded.subtopic",
      [Number(row.id), userId, result.data.studyDate, result.data.disciplineId, result.data.topic, result.data.subtopic],
    ));
  }
  for (const row of notes) {
    if (!disciplineIds.has(Number(row.disciplina_id))) throw new Error(`Invalid anotacoes row ${String(row.disciplina_id)}`);
    statements.push(batchStatement(
      "INSERT INTO discipline_notes (user_id, discipline_id, body, updated_at) VALUES (?, ?, ?, coalesce(?, datetime('now'))) ON CONFLICT(user_id, discipline_id) DO UPDATE SET body = excluded.body, updated_at = excluded.updated_at",
      [userId, Number(row.disciplina_id), String(row.texto ?? ""), row.atualizado_em ? String(row.atualizado_em) : null],
    ));
  }
  statements.push(batchStatement("DELETE FROM study_cycle_entries WHERE user_id = ?", [userId]));
  for (const row of cycle) {
    if (!disciplineIds.has(Number(row.disciplina_id))) throw new Error(`Invalid ciclo_estudos row ${String(row.id)}`);
    statements.push(batchStatement(
      "INSERT INTO study_cycle_entries (id, user_id, discipline_id, position, hours) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET user_id = excluded.user_id, discipline_id = excluded.discipline_id, position = excluded.position, hours = excluded.hours",
      [Number(row.id), userId, Number(row.disciplina_id), Number(row.posicao), Number(row.horas ?? 1)],
    ));
  }
  await target.batch(statements, "write");
  console.log(`Imported ${statements.length - 1} legacy rows for ${ownerEmail}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
