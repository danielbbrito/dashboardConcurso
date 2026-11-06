import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import {
  todayDateOnly,
  toDateOnly,
  validateQuestionSession,
  validateStudiedTopic,
  validateStudyHours,
  type DateOnly,
  type DisciplineId,
} from "../lib/domain";

const execFileAsync = promisify(execFile);
type Row = Record<string, unknown>;

const tableNames = ["disciplinas", "registros", "anotacoes", "horas_estudo", "materias", "ciclo_estudos"] as const;

const difficultyLabels: Record<string, string> = {
  "Muito fácil": "muito_facil",
  "Fácil": "facil",
  "Médio": "medio",
  "Difícil": "dificil",
};

async function query(source: string, sql: string): Promise<Row[]> {
  const { stdout } = await execFileAsync("sqlite3", ["-readonly", "-json", source, sql]);
  return JSON.parse(stdout || "[]") as Row[];
}

function sha256(value: unknown): string {
  const input = Buffer.isBuffer(value) ? value : JSON.stringify(value);
  return createHash("sha256").update(input).digest("hex");
}

function sortedChecksum(rows: Row[], fields: string[]): string {
  const canonical = rows
    .map((row) => fields.map((field) => row[field] ?? null))
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
    .map((row) => JSON.stringify(row))
    .join("\n");
  return sha256(canonical);
}

function addAggregate(target: Record<string, Record<string, number>>, key: string, values: Record<string, number>): void {
  const current = target[key] ?? {};
  for (const [field, value] of Object.entries(values)) current[field] = (current[field] ?? 0) + value;
  target[key] = current;
}

function pushInvalid(invalidRows: Row[], table: string, id: unknown, reason: string): void {
  invalidRows.push({ table, id: id ?? null, reason });
}

async function buildReport(source: string, ownerEmail: string, validationDate: DateOnly) {
  const schema: Record<string, string[]> = {};
  for (const table of tableNames) {
    const columns = await query(source, `PRAGMA table_info("${table}")`);
    schema[table] = columns.map((column) => String(column.name));
  }
  const sourceRows: Record<string, Row[]> = {};
  for (const table of tableNames) sourceRows[table] = await query(source, `SELECT * FROM "${table}"`);

  const disciplines = sourceRows.disciplinas.map((row) => ({
    id: Number(row.id) as DisciplineId,
    name: String(row.nome),
    block: String(row.bloco),
    examItems: Number(row.itens_prova),
    displayOrder: Number(row.ordem),
  }));
  const knownDisciplines = new Set<number>(disciplines.map((discipline) => discipline.id));
  const invalidRows: Row[] = [];
  const normalization = { defaultDifficulty: 0, difficultyLabels: 0 };
  const questionRows: Row[] = [];
  const hoursRows: Row[] = [];
  const topicRows: Row[] = [];
  const noteRows: Row[] = [];
  const cycleRows: Row[] = [];
  const questionTotalsByDateDiscipline: Record<string, Record<string, number>> = {};
  const hoursByDate: Record<string, Record<string, number>> = {};
  const topicsByDateDiscipline: Record<string, Record<string, number>> = {};

  const registrationColumns = new Set(schema.registros);
  for (const row of sourceRows.registros) {
    const disciplineId = Number(row.disciplina_id) as DisciplineId;
    let difficulty = "medio";
    if (registrationColumns.has("dificuldade") && row.dificuldade) {
      difficulty = difficultyLabels[String(row.dificuldade)] ?? String(row.dificuldade);
      normalization.difficultyLabels += 1;
    } else {
      normalization.defaultDifficulty += 1;
    }
    const result = validateQuestionSession(
      {
        studyDate: row.data,
        disciplineId,
        questionsAttempted: Number(row.feitas),
        correctAnswers: Number(row.acertos),
        guesses: Number(row.chutes),
        correctGuesses: Number(row.chutes_certos),
        difficulty,
        topic: registrationColumns.has("materia") ? row.materia ?? null : null,
        subtopic: registrationColumns.has("submateria") ? row.submateria ?? null : null,
      },
      { today: validationDate },
    );
    if (!knownDisciplines.has(disciplineId)) {
      pushInvalid(invalidRows, "registros", row.id, "discipline_id does not exist in disciplinas");
    } else if (!result.success) {
      pushInvalid(invalidRows, "registros", row.id, result.error.error.message);
    } else {
      const mapped = result.data;
      questionRows.push({
        sourceId: row.id,
        studyDate: mapped.studyDate,
        disciplineId: mapped.disciplineId,
        questionsAttempted: mapped.questionsAttempted,
        correctAnswers: mapped.correctAnswers,
        guesses: mapped.guesses,
        correctGuesses: mapped.correctGuesses,
        difficulty: mapped.difficulty,
        topic: mapped.topic,
        subtopic: mapped.subtopic,
      });
      addAggregate(questionTotalsByDateDiscipline, `${mapped.studyDate}|${mapped.disciplineId}`, {
        attempted: mapped.questionsAttempted,
        correct: mapped.correctAnswers,
        guesses: mapped.guesses,
        correctGuesses: mapped.correctGuesses,
      });
    }
  }

  for (const row of sourceRows.horas_estudo) {
    const result = validateStudyHours({ studyDate: row.data, hours: Number(row.horas) }, { today: validationDate });
    if (!result.success) pushInvalid(invalidRows, "horas_estudo", row.id, result.error.error.message);
    else {
      hoursRows.push({ sourceId: row.id, studyDate: result.data.studyDate, hours: result.data.hours });
      addAggregate(hoursByDate, result.data.studyDate, { hours: result.data.hours });
    }
  }

  for (const row of sourceRows.materias) {
    const disciplineId = Number(row.disciplina_id) as DisciplineId;
    const result = validateStudiedTopic({
      studyDate: row.data,
      disciplineId,
      topic: row.materia,
      subtopic: row.submateria ?? null,
    }, { today: validationDate });
    if (!knownDisciplines.has(disciplineId)) pushInvalid(invalidRows, "materias", row.id, "discipline_id does not exist in disciplinas");
    else if (!result.success) pushInvalid(invalidRows, "materias", row.id, result.error.error.message);
    else {
      topicRows.push({ sourceId: row.id, ...result.data });
      addAggregate(topicsByDateDiscipline, `${result.data.studyDate}|${result.data.disciplineId}`, { records: 1 });
    }
  }

  for (const row of sourceRows.anotacoes) {
    const disciplineId = Number(row.disciplina_id) as DisciplineId;
    if (!knownDisciplines.has(disciplineId)) pushInvalid(invalidRows, "anotacoes", row.disciplina_id, "discipline_id does not exist in disciplinas");
    else noteRows.push({ disciplineId, length: String(row.texto ?? "").length, bodySha256: sha256(String(row.texto ?? "")) });
  }

  const cyclePositions = new Set<number>();
  const cycleDisciplines = new Set<number>();
  for (const row of sourceRows.ciclo_estudos) {
    const position = Number(row.posicao);
    const disciplineId = Number(row.disciplina_id);
    const hours = Number(row.horas ?? 1);
    if (!knownDisciplines.has(disciplineId)) pushInvalid(invalidRows, "ciclo_estudos", row.id, "discipline_id does not exist in disciplinas");
    else if (cyclePositions.has(position)) pushInvalid(invalidRows, "ciclo_estudos", row.id, "duplicate position");
    else if (cycleDisciplines.has(disciplineId)) pushInvalid(invalidRows, "ciclo_estudos", row.id, "duplicate discipline");
    else if (!Number.isFinite(hours) || hours <= 0 || hours > 60) pushInvalid(invalidRows, "ciclo_estudos", row.id, "hours must be greater than 0 and at most 60");
    else {
      cyclePositions.add(position);
      cycleDisciplines.add(disciplineId);
      cycleRows.push({ sourceId: row.id, position, disciplineId, hours });
    }
  }

  const sourceCounts = Object.fromEntries(tableNames.map((table) => [table, sourceRows[table].length]));
  const mappedCounts = {
    disciplines: disciplines.length,
    question_sessions: questionRows.length,
    discipline_notes: noteRows.length,
    study_hours: hoursRows.length,
    studied_topics: topicRows.length,
    study_cycle_entries: cycleRows.length,
  };
  return {
    importerVersion: 1,
    dryRun: true,
    writesPerformed: 0,
    source: {
      relativePath: path.relative(process.cwd(), source),
      sha256: sha256(await readFile(source)),
      schema,
      sourceReadMode: "sqlite3 -readonly",
    },
    owner: {
      email: ownerEmail.trim().toLowerCase(),
      assignment: "operator-configured owner; never inferred from login",
    },
    validationDate,
    sourceCounts,
    mappedCounts,
    invalidRows,
    normalization,
    aggregates: {
      questionTotalsByDateDiscipline,
      hoursByDate,
      topicsByDateDiscipline,
    },
    checksums: {
      disciplines: sortedChecksum(disciplines, ["id", "name", "block", "examItems", "displayOrder"]),
      questionSessions: sortedChecksum(questionRows, ["sourceId", "studyDate", "disciplineId", "questionsAttempted", "correctAnswers", "guesses", "correctGuesses", "difficulty", "topic", "subtopic"]),
      disciplineNotes: sortedChecksum(noteRows, ["disciplineId", "length", "bodySha256"]),
      studyHours: sortedChecksum(hoursRows, ["sourceId", "studyDate", "hours"]),
      studiedTopics: sortedChecksum(topicRows, ["sourceId", "studyDate", "disciplineId", "topic", "subtopic"]),
      studyCycleEntries: sortedChecksum(cycleRows, ["sourceId", "position", "disciplineId", "hours"]),
    },
    idempotency: {
      strategy: "preserve source integer IDs where available; upsert catalog by discipline ID; upsert owner by configured provider identity",
      duplicatePolicy: "same source ID and owner scope must be updated or skipped, never duplicated",
    },
  };
}

function argument(name: string, fallback?: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

async function main(): Promise<void> {
  const source = path.resolve(argument("--source", "../data/estudos.db") as string);
  const ownerEmail = argument("--owner-email", process.env.MIGRATION_OWNER_EMAIL);
  const output = path.resolve(argument("--output", "phase0/migration-dry-run.json") as string);
  const validationDate = toDateOnly(argument("--today", todayDateOnly()) as string);
  if (!ownerEmail) throw new Error("MIGRATION_OWNER_EMAIL or --owner-email is required");
  const report = await buildReport(source, ownerEmail, validationDate);
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Dry-run report: ${output}`);
  console.log(`Invalid rows: ${report.invalidRows.length}`);
  console.log(`Writes performed: ${report.writesPerformed}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
