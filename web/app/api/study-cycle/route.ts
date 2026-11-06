import { apiError, apiServerError, apiSuccess } from "@/lib/api";
import { resolveAuthorizedUser } from "@/lib/authorization";
import { ensureApplicationUser } from "@/lib/application-user";
import { invalidateUserTag, CACHE_TAGS } from "@/lib/cache-tags";
import { type DisciplineId } from "@/lib/domain";
import { getInitializedCycle, updateCycleHours, updateCycleOrder } from "@/lib/cycle-service";

export async function GET() {
  try {
    const authorization = await resolveAuthorizedUser();
    if (authorization.status === "unauthenticated") return apiError("UNAUTHENTICATED", "É necessário entrar para continuar.", 401);
    if (authorization.status === "unauthorized") return apiError("UNAUTHORIZED", "Esta conta não está autorizada.", 403);
    return apiSuccess(await getInitializedCycle(await ensureApplicationUser(authorization.user)));
  } catch { return apiServerError(); }
}

export async function PUT(request: Request) {
  try {
    const authorization = await resolveAuthorizedUser();
    if (authorization.status === "unauthenticated") return apiError("UNAUTHENTICATED", "É necessário entrar para continuar.", 401);
    if (authorization.status === "unauthorized") return apiError("UNAUTHORIZED", "Esta conta não está autorizada.", 403);
    const body = await request.json() as { order?: unknown; hours?: unknown };
    const userId = await ensureApplicationUser(authorization.user);
    if (Array.isArray(body.order)) {
      if (!body.order.every((id) => Number.isInteger(id) && Number(id) > 0)) return apiError("VALIDATION_ERROR", "Ordem inválida.", 422, { order: "Informe uma permutação de disciplinas." });
      const result = await updateCycleOrder(userId, body.order as DisciplineId[]);
      invalidateUserTag(CACHE_TAGS.cycle, userId);
      return apiSuccess(result);
    }
    if (body.hours && typeof body.hours === "object" && !Array.isArray(body.hours)) {
      const result = await updateCycleHours(userId, body.hours as Record<string, number>);
      invalidateUserTag(CACHE_TAGS.cycle, userId);
      return apiSuccess(result);
    }
    return apiError("VALIDATION_ERROR", "Informe a ordem ou as horas do ciclo.", 422);
  } catch (error) {
    if (error instanceof Error && error.message.includes("ordem")) return apiError("VALIDATION_ERROR", error.message, 422);
    return apiServerError();
  }
}
