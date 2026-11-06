import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@libsql/client";

import { runMigrations } from "./migrate";

const migration = `
CREATE TABLE sample (id INTEGER PRIMARY KEY, value TEXT NOT NULL);
`;

test("runs a migration once and is safe to repeat", async () => {
  const client = createClient({ url: "file::memory:" });
  const migrations = [{ id: "0001_sample", sql: migration }];
  await runMigrations(client, migrations);
  await runMigrations(client, migrations);
  const rows = await client.execute("SELECT id FROM _app_migrations");
  const tables = await client.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'sample'");
  assert.equal(rows.rows.length, 1);
  assert.equal(tables.rows.length, 1);
});

test("rolls back a failed migration", async () => {
  const client = createClient({ url: "file::memory:" });
  await assert.rejects(() => runMigrations(client, [{ id: "0001_broken", sql: "CREATE TABLE broken (id INTEGER); THIS IS INVALID;" }]));
  const rows = await client.execute("SELECT id FROM _app_migrations");
  const tables = await client.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'broken'");
  assert.equal(rows.rows.length, 0);
  assert.equal(tables.rows.length, 0);
});
