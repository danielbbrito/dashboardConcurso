import { apiError, apiServerError, apiSuccess } from "@/lib/api";
import { resolveAuthorizedUser } from "@/lib/authorization";
import { listQuestionMetricRows } from "@/lib/db/repository";
import { compareAccumulated, isDateOnly, toDateOnly, type DisciplineId, type UserId } from "@/lib/domain";

export async function GET(request: Request) {
  try {
    const authorization = await resolveAuthorizedUser();
    if (authorization.status === "unauthenticated") return apiError("UNAUTHENTICATED", "É necessário entrar para continuar.", 401);
    if (authorization.status === "unauthorized") return apiError("UNAUTHORIZED", "Esta conta não está autorizada.", 403);
    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    if (!from || !to || !isDateOnly(from) || !isDateOnly(to)) return apiError("VALIDATION_ERROR", "Informe duas datas válidas.", 400, { from: "Data inválida.", to: "Data inválida." });
    if (from >= to) return apiError("VALIDATION_ERROR", "A data A deve ser anterior à data B.", 400, { to: "Escolha uma data posterior à data A." });
    const disciplineIds = url.searchParams.get("disciplines")?.split(",").map(Number).filter((id) => Number.isInteger(id) && id > 0) as DisciplineId[] | undefined;
    const userId = (authorization.user.providerSubject ?? "development-local") as UserId;
    const rows = await listQuestionMetricRows(userId, { to: toDateOnly(to), disciplineIds });
    return apiSuccess(compareAccumulated(rows, toDateOnly(from), toDateOnly(to)));
  } catch {
    return apiServerError();
  }
}
