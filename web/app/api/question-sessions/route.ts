import { apiError, apiServerError, apiSuccess } from "@/lib/api";
import { resolveAuthorizedUser } from "@/lib/authorization";
import { ensureApplicationUser } from "@/lib/application-user";
import { invalidateUserTag, CACHE_TAGS } from "@/lib/cache-tags";
import { listQuestionSessions } from "@/lib/db/repository";
import { todayDateOnly } from "@/lib/domain";
import { getServerEnv } from "@/lib/env";
import { parseFilters } from "@/lib/filters";
import { saveQuestionSession } from "@/lib/recording-services";

export async function GET(request: Request) {
  try {
    const authorization = await resolveAuthorizedUser();
    if (authorization.status === "unauthenticated") return apiError("UNAUTHENTICATED", "É necessário entrar para continuar.", 401);
    if (authorization.status === "unauthorized") return apiError("UNAUTHORIZED", "Esta conta não está autorizada.", 403);
    const env = getServerEnv();
    const url = new URL(request.url);
    const filters = parseFilters(url.searchParams, todayDateOnly(env.timezone));
    const userId = await ensureApplicationUser(authorization.user);
    const result = await listQuestionSessions(userId, { from: filters.from, to: filters.to, disciplineIds: filters.disciplineIds }, Number(url.searchParams.get("page") ?? 1), Number(url.searchParams.get("pageSize") ?? 25));
    return apiSuccess(result);
  } catch {
    return apiServerError();
  }
}

export async function POST(request: Request) {
  try {
    const authorization = await resolveAuthorizedUser();
    if (authorization.status === "unauthenticated") return apiError("UNAUTHENTICATED", "É necessário entrar para continuar.", 401);
    if (authorization.status === "unauthorized") return apiError("UNAUTHORIZED", "Esta conta não está autorizada.", 403);
    const env = getServerEnv();
    const result = await saveQuestionSession(authorization.user, await request.json() as unknown, todayDateOnly(env.timezone));
    if (!result.success) return apiError(result.error.error.code, result.error.error.message, 422, result.error.error.fields);
    const userId = await ensureApplicationUser(authorization.user);
    invalidateUserTag(CACHE_TAGS.overview, userId);
    invalidateUserTag(CACHE_TAGS.disciplineAnalytics, userId);
    invalidateUserTag(CACHE_TAGS.topics, userId);
    return apiSuccess(result.data, { status: 201 });
  } catch {
    return apiServerError();
  }
}
