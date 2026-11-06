import { apiError, apiServerError, apiSuccess } from "@/lib/api";
import { resolveAuthorizedUser } from "@/lib/authorization";
import { ensureApplicationUser } from "@/lib/application-user";
import { invalidateUserTag, CACHE_TAGS } from "@/lib/cache-tags";
import { deleteQuestionSession } from "@/lib/db/repository";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authorization = await resolveAuthorizedUser();
    if (authorization.status === "unauthenticated") return apiError("UNAUTHENTICATED", "É necessário entrar para continuar.", 401);
    if (authorization.status === "unauthorized") return apiError("UNAUTHORIZED", "Esta conta não está autorizada.", 403);
    const userId = await ensureApplicationUser(authorization.user);
    const { id } = await params;
    if (!/^\d+$/.test(id)) return apiError("VALIDATION_ERROR", "Identificador inválido.", 400);
    const deleted = await deleteQuestionSession(id, userId);
    if (!deleted) return apiError("NOT_FOUND", "Registro não encontrado.", 404);
    invalidateUserTag(CACHE_TAGS.overview, userId);
    invalidateUserTag(CACHE_TAGS.disciplineAnalytics, userId);
    invalidateUserTag(CACHE_TAGS.topics, userId);
    return apiSuccess({ deleted: true });
  } catch {
    return apiServerError();
  }
}
