import type { Client } from "@libsql/client";

export type Migration = {
  id: string;
  sql: string;
};

function splitStatements(sql: string): string[] {
  return sql
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);
}

export async function runMigrations(client: Client, migrations: Migration[]): Promise<void> {
  await client.execute("PRAGMA foreign_keys = ON");
  await client.execute(
    "CREATE TABLE IF NOT EXISTS _app_migrations (id TEXT PRIMARY KEY NOT NULL, applied_at TEXT NOT NULL DEFAULT (datetime('now'))) ",
  );
  const appliedResult = await client.execute("SELECT id FROM _app_migrations ORDER BY id");
  const applied = new Set(appliedResult.rows.map((row) => String(row.id)));

  for (const migration of migrations) {
    if (applied.has(migration.id)) continue;
    const escapedId = migration.id.replaceAll("'", "''");
    const statements = splitStatements(
      `${migration.sql}\nINSERT INTO _app_migrations (id) VALUES ('${escapedId}');`,
    ).map((sql) => ({ sql, args: [] as string[] }));
    await client.batch(statements, "write");
  }
}
