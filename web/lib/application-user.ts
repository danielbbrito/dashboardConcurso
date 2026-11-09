import "server-only";

import type { AuthorizedUser } from "@/lib/authorization";
import type { UserId } from "@/lib/domain";

export async function ensureApplicationUser(user: AuthorizedUser): Promise<UserId> {
  return (user.providerSubject ?? "single-user") as UserId;
}
