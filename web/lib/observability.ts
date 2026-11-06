import { randomUUID } from "node:crypto";

export function requestIdFrom(headers: Headers): string {
  const incoming = headers.get("x-request-id")?.trim();
  return incoming && /^[a-zA-Z0-9._:-]{1,100}$/.test(incoming) ? incoming : randomUUID();
}

export function logServerEvent(event: string, fields: Record<string, string | number | boolean | undefined> = {}): void {
  console.info(JSON.stringify({ event, ...fields }));
}
