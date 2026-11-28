import { createClient } from "@libsql/client";
import { mkdir } from "node:fs/promises";
import path from "node:path";

import { ensureRecordCommentColumns } from "../lib/db/migrate-record-comments";

async function main(): Promise<void> {
  await mkdir(path.resolve(".local"), { recursive: true });
  const authToken = process.env.DATABASE_AUTH_TOKEN ?? process.env.ESTUDOS_DB_TOKEN;
  const client = createClient({
    url: process.env.DATABASE_URL ?? process.env.ESTUDOS_DB_URL ?? "file:./.local/concurso.sqlite3",
    ...(authToken ? { authToken } : {}),
  });
  try {
    await ensureRecordCommentColumns(client);
    console.log("Comment columns are ready on registros and materias.");
  } finally {
    await client.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
