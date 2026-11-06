import "server-only";

import { listDisciplines, listStudyCycle, saveStudyCycleHours, saveStudyCycleOrder } from "@/lib/db/repository";
import type { DisciplineId, UserId } from "@/lib/domain";

export async function getInitializedCycle(userId: UserId) {
  const disciplines = await listDisciplines();
  let entries = await listStudyCycle(userId);
  if (entries.length === 0 && disciplines.length > 0) {
    await saveStudyCycleOrder(userId, disciplines.map((discipline) => discipline.id));
    entries = await listStudyCycle(userId);
  }
  const byId = new Map(disciplines.map((discipline) => [discipline.id, discipline]));
  const items = entries.map((entry) => ({ ...entry, discipline: byId.get(entry.disciplineId) })).filter((entry): entry is typeof entry & { discipline: NonNullable<typeof entry.discipline> } => Boolean(entry.discipline));
  const totalHours = items.reduce((sum, entry) => sum + entry.hours, 0);
  return { items, totalHours, averageHours: items.length > 0 ? totalHours / items.length : 0 };
}

export async function updateCycleOrder(userId: UserId, order: DisciplineId[]) {
  await saveStudyCycleOrder(userId, order);
  return getInitializedCycle(userId);
}

export async function updateCycleHours(userId: UserId, hours: Record<string, number>) {
  await saveStudyCycleHours(userId, hours);
  return getInitializedCycle(userId);
}
