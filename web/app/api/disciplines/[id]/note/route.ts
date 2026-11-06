import { apiError, apiServerError, apiSuccess } from "@/lib/api";
import { resolveAuthorizedUser } from "@/lib/authorization";
import { ensureApplicationUser } from "@/lib/application-user";
import { invalidateUserTag, CACHE_TAGS } from "@/lib/cache-tags";
import { getDiscipline, getDisciplineNote, upsertDisciplineNote } from "@/lib/db/repository";
import { type DisciplineId } from "@/lib/domain";

async function context(idValue: string) {
  const id = Number(idValue);
  if (!Number.isInteger(id) || id < 1) return null;
  const authorization = await resolveAuthorizedUser();
  if (authorization.status !== "authorized") return { authorization };
  const discipline = await getDiscipline(id as DisciplineId);
  if (!discipline) return { authorization, discipline: null };
  return { authorization, discipline, userId: await ensureApplicationUser(authorization.user), disciplineId: id as DisciplineId };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const value = await context((await params).id);
    if (!value) return apiError("NOT_FOUND", "Disciplina não encontrada.", 404);
    if (value.authorization.status === "unauthenticated") return apiError("UNAUTHENTICATED", "É necessário entrar para continuar.", 401);
    if (value.authorization.status === "unauthorized") return apiError("UNAUTHORIZED", "Esta conta não está autorizada.", 403);
    if (!value.discipline) return apiError("NOT_FOUND", "Disciplina não encontrada.", 404);
    return apiSuccess(await getDisciplineNote(value.userId, value.disciplineId));
  } catch {
    return apiServerError();
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const value = await context((await params).id);
    if (!value) return apiError("NOT_FOUND", "Disciplina não encontrada.", 404);
    if (value.authorization.status === "unauthenticated") return apiError("UNAUTHENTICATED", "É necessário entrar para continuar.", 401);
    if (value.authorization.status === "unauthorized") return apiError("UNAUTHORIZED", "Esta conta não está autorizada.", 403);
    if (!value.discipline) return apiError("NOT_FOUND", "Disciplina não encontrada.", 404);
    const body = await request.json() as { body?: unknown };
    if (typeof body.body !== "string" || body.body.length > 20_000) return apiError("VALIDATION_ERROR", "A anotação deve ser um texto de até 20.000 caracteres.", 422, { body: "Texto inválido." });
    const note = await upsertDisciplineNote(value.userId, value.disciplineId, body.body);
    invalidateUserTag(CACHE_TAGS.disciplineAnalytics, value.userId);
    return apiSuccess(note);
  } catch {
    return apiServerError();
  }
}
