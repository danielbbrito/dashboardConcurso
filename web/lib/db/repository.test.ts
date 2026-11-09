import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@libsql/client";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { toDateOnly } from "@/lib/domain";
import type { DisciplineId, UserId } from "@/lib/domain";

test("repositories scope user data and keep cycle mutations atomic", async () => {
  const databasePath = join(tmpdir(), `concurso-repository-${randomUUID()}.sqlite3`);
  process.env.DATABASE_URL = `file:${databasePath}`;
  const migrationClient = createClient({ url: `file:${databasePath}` });
  await migrationClient.batch([
    "CREATE TABLE disciplinas (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, bloco TEXT NOT NULL, itens_prova INTEGER NOT NULL, ordem INTEGER NOT NULL)",
    "CREATE TABLE registros (id INTEGER PRIMARY KEY AUTOINCREMENT, data TEXT NOT NULL, disciplina_id INTEGER NOT NULL, feitas INTEGER NOT NULL, acertos INTEGER NOT NULL, chutes INTEGER NOT NULL, chutes_certos INTEGER NOT NULL, criado_em TEXT, dificuldade TEXT, materia TEXT, submateria TEXT)",
    "CREATE TABLE anotacoes (disciplina_id INTEGER PRIMARY KEY, texto TEXT NOT NULL, atualizado_em TEXT)",
    "CREATE TABLE horas_estudo (id INTEGER PRIMARY KEY AUTOINCREMENT, data TEXT NOT NULL, horas REAL NOT NULL, criado_em TEXT)",
    "CREATE TABLE materias (id INTEGER PRIMARY KEY AUTOINCREMENT, data TEXT NOT NULL, disciplina_id INTEGER NOT NULL, materia TEXT NOT NULL, submateria TEXT, criado_em TEXT)",
    "CREATE TABLE ciclo_estudos (id INTEGER PRIMARY KEY AUTOINCREMENT, posicao INTEGER NOT NULL, disciplina_id INTEGER NOT NULL, horas REAL NOT NULL)",
  ], "write");

  const repository = await import("./repository");
  const userOne = "user-one" as UserId;
  const userTwo = "user-two" as UserId;
  const disciplineOne = 1 as DisciplineId;
  const disciplineTwo = 2 as DisciplineId;
  await repository.insertDisciplines([
    { id: disciplineOne, name: "D1", block: "basico", examItems: 25, displayOrder: 1 },
    { id: disciplineTwo, name: "D2", block: "especifico", examItems: 25, displayOrder: 2 },
  ]);

  const session = await repository.recordQuestionSession(userOne, {
    studyDate: toDateOnly("2026-08-01"),
    disciplineId: disciplineOne,
    questionsAttempted: 10,
    correctAnswers: 8,
    guesses: 2,
    correctGuesses: 1,
    difficulty: "medio",
    topic: "Topico",
    subtopic: null,
  });
  assert.equal((await repository.listQuestionSessions(userOne)).pageInfo.total, 1);
  assert.equal((await repository.listQuestionSessions(userTwo)).pageInfo.total, 1);
  assert.equal(await repository.deleteQuestionSession(session.id, userTwo), true);

  await repository.recordStudyHours(userOne, { studyDate: toDateOnly("2026-08-01"), hours: 2 });
  assert.equal((await repository.listStudyHours(userTwo)).pageInfo.total, 1);
  await repository.recordStudiedTopic(userOne, { studyDate: toDateOnly("2026-08-01"), disciplineId: disciplineOne, topic: "Topico", subtopic: null });
  assert.equal((await repository.listStudiedTopics(userOne)).pageInfo.total, 1);
  await repository.upsertDisciplineNote(userOne, disciplineOne, "Nota privada");
  assert.equal((await repository.getDisciplineNote(userTwo, disciplineOne))?.body, "Nota privada");

  await repository.saveStudyCycleOrder(userOne, [disciplineOne, disciplineTwo]);
  await repository.saveStudyCycleHours(userOne, { "1": 2, "2": 3 });
  await repository.saveStudyCycleOrder(userOne, [disciplineTwo, disciplineOne]);
  const cycle = await repository.listStudyCycle(userOne);
  assert.deepEqual(cycle.map((entry) => [entry.disciplineId, entry.position, entry.hours]), [[disciplineTwo, 1, 3], [disciplineOne, 2, 2]]);

  await migrationClient.close();
});
