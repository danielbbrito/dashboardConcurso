import { apiError, apiServerError, apiSuccess } from "@/lib/api";
import { resolveAuthorizedUser } from "@/lib/authorization";
import { ensureApplicationUser } from "@/lib/application-user";
import { invalidateUserTag, CACHE_TAGS } from "@/lib/cache-tags";
import { deleteStudiedTopic } from "@/lib/db/repository";
import { editStudiedTopic } from "@/lib/recording-services";
import { getServerEnv } from "@/lib/env";
import { todayDateOnly } from "@/lib/domain";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authorization = await resolveAuthorizedUser();
    if (authorization.status === "unauthenticated") return apiError("UNAUTHENTICATED", "É necessário entrar para continuar.", 401);
    if (authorization.status === "unauthorized") return apiError("UNAUTHORIZED", "Esta conta não está autorizada.", 403);
    const { id } = await params;
    if (!/^\d+$/.test(id)) return apiError("VALIDATION_ERROR", "Identificador inválido.", 400);
    const result = await editStudiedTopic(authorization.user, id, await request.json() as unknown, todayDateOnly(getServerEnv().timezone));
    if (!result.success) return apiError(result.error.error.code, result.error.error.message, 422, result.error.error.fields);
    if (!result.data) return apiError("NOT_FOUND", "Registro não encontrado.", 404);
    const userId = await ensureApplicationUser(authorization.user);
    invalidateUserTag(CACHE_TAGS.topics, userId);
    invalidateUserTag(CACHE_TAGS.reviews, userId);
    return apiSuccess(result.data);
  } catch (error) {
    return apiServerError(error);
  }
}

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
