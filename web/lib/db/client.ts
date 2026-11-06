import "server-only";

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema";

const url = process.env.DATABASE_URL ?? process.env.ESTUDOS_DB_URL ?? "file:./.local/concurso.sqlite3";
const authToken = process.env.DATABASE_AUTH_TOKEN ?? process.env.ESTUDOS_DB_TOKEN;

export const libsqlClient = createClient({ url, authToken });
export const db = drizzle(libsqlClient, { schema });
