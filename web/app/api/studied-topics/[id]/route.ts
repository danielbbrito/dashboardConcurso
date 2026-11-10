import { apiError, apiServerError, apiSuccess } from "@/lib/api";
import { resolveAuthorizedUser } from "@/lib/authorization";
import { ensureApplicationUser } from "@/lib/application-user";
import { invalidateUserTag, CACHE_TAGS } from "@/lib/cache-tags";
import { deleteStudiedTopic } from "@/lib/db/repository";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authorization = await resolveAuthorizedUser();
    if (authorization.status === "unauthenticated") return apiError("UNAUTHENTICATED", "É necessário entrar para continuar.", 401);
    if (authorization.status === "unauthorized") return apiError("UNAUTHORIZED", "Esta conta não está autorizada.", 403);
    const userId = await ensureApplicationUser(authorization.user);
    const { id } = await params;
    if (!/^\d+$/.test(id)) return apiError("VALIDATION_ERROR", "Identificador inválido.", 400);
    if (!await deleteStudiedTopic(id, userId)) return apiError("NOT_FOUND", "Registro não encontrado.", 404);
    invalidateUserTag(CACHE_TAGS.topics, userId);
    invalidateUserTag(CACHE_TAGS.reviews, userId);
    return apiSuccess({ deleted: true });
  } catch (error) {
    return apiServerError(error);
  }
}
