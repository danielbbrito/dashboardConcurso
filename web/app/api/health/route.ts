import { NextResponse } from "next/server";

import { libsqlClient } from "@/lib/db/client";
import { logServerEvent, requestIdFrom } from "@/lib/observability";

export async function GET(request: Request) {
  const requestId = requestIdFrom(new Headers(request.headers));
  try {
    await libsqlClient.execute("SELECT 1");
    logServerEvent("health.check", { requestId, database: true });
    const response = NextResponse.json({ status: "ok", database: "ok", requestId });
    response.headers.set("x-request-id", requestId);
    return response;
  } catch {
    logServerEvent("health.check", { requestId, database: false });
    const response = NextResponse.json({ status: "degraded", database: "unavailable", requestId }, { status: 503 });
    response.headers.set("x-request-id", requestId);
    return response;
  }
}
