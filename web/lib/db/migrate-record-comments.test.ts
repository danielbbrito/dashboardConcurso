import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@libsql/client";

import { ensureRecordCommentColumns } from "./migrate-record-comments";

test("adds comment columns to legacy record tables idempotently", async () => {
  const client = createClient({ url: "file::memory:" });
  await client.batch([
    "CREATE TABLE registros (id INTEGER PRIMARY KEY, data TEXT NOT NULL)",
    "CREATE TABLE materias (id INTEGER PRIMARY KEY, data TEXT NOT NULL)",
    "INSERT INTO registros (id, data) VALUES (1, '2026-08-01')",
    "INSERT INTO materias (id, data) VALUES (1, '2026-08-01')",
  ], "write");

  await ensureRecordCommentColumns(client);
  await ensureRecordCommentColumns(client);

  for (const table of ["registros", "materias"]) {
    const result = await client.execute(`PRAGMA table_info("${table}")`);
    assert.ok(result.rows.some((row) => String(row.name) === "comentario"));
    const records = await client.execute(`SELECT comentario FROM "${table}" WHERE id = 1`);
    assert.equal(records.rows[0]?.comentario, null);
  }
  await client.close();
});
