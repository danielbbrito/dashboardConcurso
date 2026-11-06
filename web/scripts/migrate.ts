import { createClient } from "@libsql/client";
import { mkdir, readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { runMigrations } from "../lib/db/migrate";

const migrationsDirectory = path.resolve("migrations");

async function main(): Promise<void> {
  await mkdir(path.resolve(".local"), { recursive: true });
  const migrationFiles = (await readdir(migrationsDirectory))
    .filter((file) => file.endsWith(".sql"))
    .sort();
  const migrations = await Promise.all(
    migrationFiles.map(async (file) => ({
      id: file.replace(/\.sql$/, ""),
      sql: await readFile(path.join(migrationsDirectory, file), "utf8"),
    })),
  );
  const client = createClient({
    url: process.env.DATABASE_URL ?? process.env.ESTUDOS_DB_URL ?? "file:./.local/concurso.sqlite3",
    authToken: process.env.DATABASE_AUTH_TOKEN ?? process.env.ESTUDOS_DB_TOKEN,
  });

  await runMigrations(client, migrations);
  console.log(`Applied migrations: ${migrations.map(({ id }) => id).join(", ") || "none"}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
