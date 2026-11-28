import type { Client } from "@libsql/client";

const tables = ["registros", "materias"] as const;

export async function ensureRecordCommentColumns(client: Client): Promise<void> {
  for (const table of tables) {
    const result = await client.execute(`PRAGMA table_info("${table}")`);
    if (result.rows.length === 0) {
      throw new Error(`Required legacy table is missing: ${table}`);
    }

    if (!result.rows.some((row) => String(row.name) === "comentario")) {
      await client.execute(`ALTER TABLE "${table}" ADD COLUMN comentario TEXT`);
    }
  }
}
