import type { Config } from "drizzle-kit";

export default {
  schema: "./lib/db/schema.ts",
  out: "./migrations",
  dialect: "turso",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? process.env.ESTUDOS_DB_URL ?? "file:./.local/concurso.sqlite3",
    authToken: process.env.DATABASE_AUTH_TOKEN ?? process.env.ESTUDOS_DB_TOKEN,
  },
} satisfies Config;
