import "server-only";

import { DISCIPLINES } from "@/lib/catalog";

import { insertDisciplines } from "./repository";

export const SEED_VERSION = "disciplines-and-edict-topics-v1";

export async function seedCatalog(): Promise<void> {
  await insertDisciplines(
    DISCIPLINES.map((discipline) => ({
      ...discipline,
      id: discipline.id as Parameters<typeof insertDisciplines>[0][number]["id"],
    })),
  );
}
