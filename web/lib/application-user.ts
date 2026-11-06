import "server-only";

import type { AuthorizedUser } from "@/lib/authorization";
import type { UserId } from "@/lib/domain";

import { upsertUser } from "@/lib/db/repository";

export async function ensureApplicationUser(user: AuthorizedUser): Promise<UserId> {
  const providerSubject = user.providerSubject ?? "development-local";
  const email = user.isLocal ? "development-local@example.invalid" : user.email;
  const id = providerSubject as UserId;
  await upsertUser({ id, providerSubject, email });
  return id;
}
