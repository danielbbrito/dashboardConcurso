import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
type Row = Record<string, unknown>;

async function query(database: string, sql: string): Promise<Row[]> {
  const source = database.replace(/^file:/, "");
  const { stdout } = await execFileAsync("sqlite3", ["-readonly", "-json", source, sql]);
  return JSON.parse(stdout || "[]") as Row[];
}

function quote(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function normalizedRows(rows: Row[], fields: string[]): string {
  return JSON.stringify(rows
    .map((row) => fields.map((field) => row[field] ?? null))
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))));
}

function equalRows(source: Row[], target: Row[], fields: string[]): boolean {
  return normalizedRows(source, fields) === normalizedRows(target, fields);
}

function cliArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index < 0) return undefined;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
  return value;
}

async function main(): Promise<void> {
  const source = path.resolve(cliArg("--source") ?? "../data/estudos.db");
  const targetValue = cliArg("--target");
  const target = targetValue ? path.resolve(targetValue.replace(/^file:/, "")) : "";
  const ownerEmail = (cliArg("--owner-email") ?? process.env.MIGRATION_OWNER_EMAIL ?? "").trim().toLowerCase();
  const output = path.resolve(cliArg("--output") ?? "phase0/migration-parity.json");
  if (!target || !ownerEmail) throw new Error("--target and --owner-email are required");
  const ownerId = `migration:${ownerEmail}`;

  const sourceCounts = await query(source, "SELECT 'disciplinas' AS table_name, COUNT(*) AS count FROM disciplinas UNION ALL SELECT 'registros', COUNT(*) FROM registros UNION ALL SELECT 'anotacoes', COUNT(*) FROM anotacoes UNION ALL SELECT 'horas_estudo', COUNT(*) FROM horas_estudo UNION ALL SELECT 'materias', COUNT(*) FROM materias UNION ALL SELECT 'ciclo_estudos', COUNT(*) FROM ciclo_estudos");
  const targetCounts = await query(target, `SELECT 'disciplines' AS table_name, COUNT(*) AS count FROM disciplines UNION ALL SELECT 'question_sessions', COUNT(*) FROM question_sessions WHERE user_id = ${quote(ownerId)} UNION ALL SELECT 'discipline_notes', COUNT(*) FROM discipline_notes WHERE user_id = ${quote(ownerId)} UNION ALL SELECT 'study_hours', COUNT(*) FROM study_hours WHERE user_id = ${quote(ownerId)} UNION ALL SELECT 'studied_topics', COUNT(*) FROM studied_topics WHERE user_id = ${quote(ownerId)} UNION ALL SELECT 'study_cycle_entries', COUNT(*) FROM study_cycle_entries WHERE user_id = ${quote(ownerId)}`);
  const sourceDisciplines = await query(source, "SELECT id, nome AS name, bloco AS block, itens_prova AS exam_items, ordem AS display_order FROM disciplinas ORDER BY id");
  const targetDisciplines = await query(target, "SELECT id, name, block, exam_items, display_order FROM disciplines ORDER BY id");
  const sourceQuestions = await query(source, "SELECT data, disciplina_id AS discipline_id, SUM(feitas) AS attempted, SUM(acertos) AS correct, SUM(chutes) AS guesses, SUM(chutes_certos) AS correct_guesses FROM registros GROUP BY data, disciplina_id ORDER BY data, disciplina_id");
  const targetQuestions = await query(target, `SELECT study_date AS data, discipline_id, SUM(questions_attempted) AS attempted, SUM(correct_answers) AS correct, SUM(guesses) AS guesses, SUM(correct_guesses) AS correct_guesses FROM question_sessions WHERE user_id = ${quote(ownerId)} GROUP BY study_date, discipline_id ORDER BY study_date, discipline_id`);
  const sourceHours = await query(source, "SELECT data, SUM(horas) AS hours FROM horas_estudo GROUP BY data ORDER BY data");
  const targetHours = await query(target, `SELECT study_date AS data, SUM(hours) AS hours FROM study_hours WHERE user_id = ${quote(ownerId)} GROUP BY study_date ORDER BY data`);
  const sourceTopics = await query(source, "SELECT data, disciplina_id AS discipline_id, COUNT(*) AS records FROM materias GROUP BY data, disciplina_id ORDER BY data, disciplina_id");
  const targetTopics = await query(target, `SELECT study_date AS data, discipline_id, COUNT(*) AS records FROM studied_topics WHERE user_id = ${quote(ownerId)} GROUP BY study_date, discipline_id ORDER BY data, discipline_id`);
  const sourceNotes = await query(source, "SELECT disciplina_id AS discipline_id, length(texto) AS length, texto FROM anotacoes ORDER BY disciplina_id");
  const targetNotes = await query(target, `SELECT discipline_id, length(body) AS length, body FROM discipline_notes WHERE user_id = ${quote(ownerId)} ORDER BY discipline_id`);
  const sourceCycle = await query(source, "SELECT posicao AS position, disciplina_id AS discipline_id, COALESCE(horas, 1) AS hours FROM ciclo_estudos ORDER BY posicao");
  const targetCycle = await query(target, `SELECT position, discipline_id, hours FROM study_cycle_entries WHERE user_id = ${quote(ownerId)} ORDER BY position`);
  const sourceKpis = await query(source, "SELECT COALESCE(SUM(feitas), 0) AS attempted, COALESCE(SUM(acertos), 0) AS correct, COALESCE(SUM(chutes), 0) AS guesses, COALESCE(SUM(chutes_certos), 0) AS correct_guesses FROM registros");
  const targetKpis = await query(target, `SELECT COALESCE(SUM(questions_attempted), 0) AS attempted, COALESCE(SUM(correct_answers), 0) AS correct, COALESCE(SUM(guesses), 0) AS guesses, COALESCE(SUM(correct_guesses), 0) AS correct_guesses FROM question_sessions WHERE user_id = ${quote(ownerId)}`);

  const notesComparable = (rows: Row[], bodyField: string) => rows.map((row) => ({ discipline_id: row.discipline_id, length: row.length, body_sha256: hash(String(row[bodyField] ?? "")) }));
  const checks = {
    rowCounts: sourceCounts.reduce<Record<string, boolean>>((result, row) => {
      const targetName = ({ disciplinas: "disciplines", registros: "question_sessions", anotacoes: "discipline_notes", horas_estudo: "study_hours", materias: "studied_topics", ciclo_estudos: "study_cycle_entries" } as Record<string, string>)[String(row.table_name)];
      result[String(row.table_name)] = Number(row.count) === Number(targetCounts.find((targetRow) => targetRow.table_name === targetName)?.count ?? -1);
      return result;
    }, {}),
    disciplines: equalRows(sourceDisciplines, targetDisciplines, ["id", "name", "block", "exam_items", "display_order"]),
    questionAggregates: equalRows(sourceQuestions, targetQuestions, ["data", "discipline_id", "attempted", "correct", "guesses", "correct_guesses"]),
    hoursAggregates: equalRows(sourceHours, targetHours, ["data", "hours"]),
    topicAggregates: equalRows(sourceTopics, targetTopics, ["data", "discipline_id", "records"]),
    notes: equalRows(notesComparable(sourceNotes, "texto"), notesComparable(targetNotes, "body"), ["discipline_id", "length", "body_sha256"]),
    cycle: equalRows(sourceCycle, targetCycle, ["position", "discipline_id", "hours"]),
    kpis: equalRows(sourceKpis, targetKpis, ["attempted", "correct", "guesses", "correct_guesses"]),
  };
  const passed = Object.values(checks).every((value) => value === true || (typeof value === "object" && Object.values(value).every(Boolean)));
  const report = {
    verificationVersion: 1,
    passed,
    sourceReadMode: "sqlite3 -readonly",
    ownerEmail,
    checks,
    sourceSha256: hash(await query(source, "SELECT name, type, sql FROM sqlite_master ORDER BY type, name")),
    targetSha256: hash(await query(target, "SELECT name, type, sql FROM sqlite_master ORDER BY type, name")),
  };
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Parity report: ${output}`);
  console.log(`Parity passed: ${passed}`);
  if (!passed) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
