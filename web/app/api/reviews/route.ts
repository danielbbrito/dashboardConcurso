import { apiError, apiServerError, apiSuccess } from "@/lib/api";
import { resolveAuthorizedUser } from "@/lib/authorization";
import { ensureApplicationUser } from "@/lib/application-user";
import { getReviewAgenda } from "@/lib/review-analytics";
import { isDateOnly, todayDateOnly } from "@/lib/domain";
import { getServerEnv } from "@/lib/env";
import { startOfReviewWeek } from "@/lib/reviews";

export async function GET(request: Request) {
  try {
    const authorization = await resolveAuthorizedUser();
    if (authorization.status === "unauthenticated") return apiError("UNAUTHENTICATED", "É necessário entrar para continuar.", 401);
    if (authorization.status === "unauthorized") return apiError("UNAUTHORIZED", "Esta conta não está autorizada.", 403);
    const url = new URL(request.url); const today = todayDateOnly(getServerEnv().timezone); const rawWeek = url.searchParams.get("week"); const week = rawWeek && isDateOnly(rawWeek) ? startOfReviewWeek(rawWeek) : startOfReviewWeek(today);
    return apiSuccess(await getReviewAgenda(await ensureApplicationUser(authorization.user), week));
  } catch (error) { return apiServerError(error); }
}
