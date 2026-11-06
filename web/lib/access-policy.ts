import type { IncomingHttpHeaders } from "node:http";

import type { ServerEnv } from "./env";

export type Identity = {
  email?: string | null;
  subjectId?: string | null;
};

export function isAllowedIdentity(identity: Identity, env: ServerEnv): boolean {
  const email = identity.email?.trim().toLowerCase();
  const subjectId = identity.subjectId?.trim();
  return Boolean(
    (email && env.allowedEmails.includes(email)) ||
      (subjectId && env.allowedSubjectIds.includes(subjectId)),
  );
}

function configuredOriginMatches(value: string | null, origins: string[]): boolean {
  if (!value) {
    return false;
  }

  try {
    return origins.includes(new URL(value).origin);
  } catch {
    return false;
  }
}

export function isLocalBypassRequest(headers: Headers | IncomingHttpHeaders, env: ServerEnv): boolean {
  if (env.nodeEnv !== "development" || !env.localAuthBypass) {
    return false;
  }

  const get = (name: string): string | null => {
    const value = headers instanceof Headers ? headers.get(name) : headers[name];
    return Array.isArray(value) ? value[0] ?? null : value ?? null;
  };

  const origin = get("origin");
  if (origin) {
    return configuredOriginMatches(origin, env.localAuthOrigins);
  }

  const referer = get("referer");
  if (referer) {
    return configuredOriginMatches(referer, env.localAuthOrigins);
  }

  const host = get("host");
  const protocol = get("x-forwarded-proto") ?? "http";
  return env.localAuthOrigins.includes(`${protocol}://${host}`);
}
