import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import type { ApiError, ApiErrorCode, ApiFieldErrors } from "@/lib/domain";

export function apiError(code: ApiErrorCode, message: string, status: number, fields?: ApiFieldErrors): NextResponse<ApiError> {
  const response = NextResponse.json({ error: { code, message, ...(fields ? { fields } : {}) } }, { status });
  response.headers.set("x-request-id", randomUUID());
  return response;
}

export function apiSuccess<T>(data: T, init?: ResponseInit): NextResponse<{ data: T }> {
  const response = NextResponse.json({ data }, init);
  response.headers.set("x-request-id", randomUUID());
  return response;
}

export function apiServerError(error?: unknown): NextResponse<ApiError> {
  if (error instanceof Error) console.error(JSON.stringify({ event: "api.server_error", error: error.name }));
  return apiError("SERVER_ERROR", "Não foi possível concluir a consulta.", 500);
}
