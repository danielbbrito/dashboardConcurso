import { apiError, apiServerError, apiSuccess } from "@/lib/api";
import { resolveAuthorizedUser } from "@/lib/authorization";
import { ensureApplicationUser } from "@/lib/application-user";
import { getDisciplineAnalytics } from "@/lib/discipline-analytics";
import { type DisciplineId, todayDateOnly } from "@/lib/domain";
import { getServerEnv } from "@/lib/env";
import { parseFilters } from "@/lib/filters";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authorization = await resolveAuthorizedUser();
    if (authorization.status === "unauthenticated") return apiError("UNAUTHENTICATED", "É necessário entrar para continuar.", 401);
    if (authorization.status === "unauthorized") return apiError("UNAUTHORIZED", "Esta conta não está autorizada.", 403);
    const id = Number((await params).id);
    if (!Number.isInteger(id) || id < 1) return apiError("NOT_FOUND", "Disciplina não encontrada.", 404);
    const filters = parseFilters(new URL(request.url).searchParams, todayDateOnly(getServerEnv().timezone));
    const result = await getDisciplineAnalytics(await ensureApplicationUser(authorization.user), id as DisciplineId, filters);
    return result ? apiSuccess(result) : apiError("NOT_FOUND", "Disciplina não encontrada.", 404);
  } catch (error) {
    return apiServerError(error);
  }
}
