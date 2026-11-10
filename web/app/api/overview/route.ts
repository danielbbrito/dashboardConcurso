import { apiError, apiSuccess, apiServerError } from "@/lib/api";
import { resolveAuthorizedUser } from "@/lib/authorization";
import { ensureApplicationUser } from "@/lib/application-user";
import { aggregateQuestionKpis, listQuestionMetricRows } from "@/lib/db/repository";
import { dailySeries, weeklySeries } from "@/lib/domain";
import { getServerEnv } from "@/lib/env";
import { parseFilters } from "@/lib/filters";
import { todayDateOnly } from "@/lib/domain";

export async function GET(request: Request) {
  try {
    const authorization = await resolveAuthorizedUser();
    if (authorization.status === "unauthenticated") return apiError("UNAUTHENTICATED", "É necessário entrar para continuar.", 401);
    if (authorization.status === "unauthorized") return apiError("UNAUTHORIZED", "Esta conta não está autorizada.", 403);
    const env = getServerEnv();
    const url = new URL(request.url);
    const filters = parseFilters(url.searchParams, todayDateOnly(env.timezone));
    const userId = await ensureApplicationUser(authorization.user);
    const repositoryFilters = { from: filters.from, to: filters.to, disciplineIds: filters.disciplineIds };
    const [kpis, rows] = await Promise.all([
      aggregateQuestionKpis(userId, repositoryFilters),
      listQuestionMetricRows(userId, repositoryFilters),
    ]);
    return apiSuccess({ filters, kpis, series: { daily: dailySeries(rows), weekly: weeklySeries(rows) } });
  } catch (error) {
    return apiServerError(error);
  }
}
