import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { isAllowedIdentity, isLocalBypassRequest } from "@/lib/access-policy";
import { getServerEnv } from "@/lib/env";

export type AuthorizedUser = {
  email: string;
  providerSubject: string | null;
  isLocal: boolean;
};

export type AuthorizationResult =
  | { status: "authorized"; user: AuthorizedUser }
  | { status: "unauthenticated" }
  | { status: "unauthorized" };

export async function resolveAuthorizedUser(): Promise<AuthorizationResult> {
  const env = getServerEnv();
  const requestHeaders = await headers();

  if (isLocalBypassRequest(requestHeaders, env)) {
    return {
      status: "authorized",
      user: {
        email: "desenvolvimento-local",
        providerSubject: null,
        isLocal: true,
      },
    };
  }

  const session = await getServerSession(authOptions);
  if (!session?.user) return { status: "unauthenticated" };

  if (!isAllowedIdentity(session.user, env)) return { status: "unauthorized" };

  return {
    status: "authorized",
    user: {
      email: session.user.email ?? "conta-autorizada",
      providerSubject: session.user.providerSubject ?? null,
      isLocal: false,
    },
  };
}

export async function requireAuthorizedUser(): Promise<AuthorizedUser> {
  const result = await resolveAuthorizedUser();
  if (result.status === "unauthenticated") redirect("/login");
  if (result.status === "unauthorized") redirect("/acesso-negado");
  return result.user;
}
