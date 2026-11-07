import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@libsql/client";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { runMigrations } from "./migrate";
import { toDateOnly } from "@/lib/domain";
import type { DisciplineId, UserId } from "@/lib/domain";

test("repositories scope user data and keep cycle mutations atomic", async () => {
  const databasePath = join(tmpdir(), `concurso-repository-${randomUUID()}.sqlite3`);
  process.env.DATABASE_URL = `file:${databasePath}`;
  const migrationClient = createClient({ url: `file:${databasePath}` });
  await runMigrations(migrationClient, [
    {
      id: "0001_initial",
      sql: readFileSync("migrations/0001_initial.sql", "utf8"),
    },
  ]);

  const repository = await import("./repository");
  const migratedUser = await repository.upsertUser({ id: "migration-owner" as UserId, providerSubject: "migration:owner", email: "owner@example.com" });
  const claimedUser = await repository.upsertUser({ id: "google-subject" as UserId, providerSubject: "google-subject", email: "OWNER@example.com" });
  assert.equal(claimedUser.id, migratedUser.id);
  assert.equal(claimedUser.providerSubject, "google-subject");

  const userOne = "user-one" as UserId;
  const userTwo = "user-two" as UserId;
  const disciplineOne = 1 as DisciplineId;
  const disciplineTwo = 2 as DisciplineId;
  await repository.upsertUser({ id: userOne, providerSubject: "subject-one", email: "one@example.com" });
  await repository.upsertUser({ id: userTwo, providerSubject: "subject-two", email: "two@example.com" });
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
  assert.equal((await repository.listQuestionSessions(userTwo)).pageInfo.total, 0);
  assert.equal(await repository.deleteQuestionSession(session.id, userTwo), false);
  assert.equal(await repository.deleteQuestionSession(session.id, userOne), true);

  await repository.recordStudyHours(userOne, { studyDate: toDateOnly("2026-08-01"), hours: 2 });
  assert.equal((await repository.listStudyHours(userTwo)).pageInfo.total, 0);
  await repository.recordStudiedTopic(userOne, { studyDate: toDateOnly("2026-08-01"), disciplineId: disciplineOne, topic: "Topico", subtopic: null });
  assert.equal((await repository.listStudiedTopics(userOne)).pageInfo.total, 1);
  await repository.upsertDisciplineNote(userOne, disciplineOne, "Nota privada");
  assert.equal((await repository.getDisciplineNote(userTwo, disciplineOne)), null);

  await repository.saveStudyCycleOrder(userOne, [disciplineOne, disciplineTwo]);
  await repository.saveStudyCycleHours(userOne, { "1": 2, "2": 3 });
  await repository.saveStudyCycleOrder(userOne, [disciplineTwo, disciplineOne]);
  const cycle = await repository.listStudyCycle(userOne);
  assert.deepEqual(cycle.map((entry) => [entry.disciplineId, entry.position, entry.hours]), [[disciplineTwo, 1, 3], [disciplineOne, 2, 2]]);

  await migrationClient.close();
});
