import { apiError, apiSuccess, apiServerError } from "@/lib/api";
import { resolveAuthorizedUser } from "@/lib/authorization";
import { listDisciplines } from "@/lib/db/repository";

export async function GET() {
  try {
    const authorization = await resolveAuthorizedUser();
    if (authorization.status === "unauthenticated") return apiError("UNAUTHENTICATED", "É necessário entrar para continuar.", 401);
    if (authorization.status === "unauthorized") return apiError("UNAUTHORIZED", "Esta conta não está autorizada.", 403);
    return apiSuccess({ items: await listDisciplines() });
  } catch (error) {
    return apiServerError(error);
  }
}
