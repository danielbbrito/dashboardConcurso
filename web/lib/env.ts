import "server-only";

type NodeEnvironment = "development" | "test" | "production";

export type ServerEnv = {
  nodeEnv: NodeEnvironment;
  databaseUrl: string;
  databaseAuthToken: string;
  authSecret: string;
  googleClientId: string;
  googleClientSecret: string;
  allowedEmails: string[];
  allowedSubjectIds: string[];
  appUrl: string;
  localAuthBypass: boolean;
  localAuthOrigins: string[];
  timezone: string;
};

function splitList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function asBoolean(value: string | undefined): boolean {
  return value?.toLowerCase() === "true";
}

export function getServerEnv(): ServerEnv {
  const nodeEnv = (process.env.NODE_ENV ?? "development") as NodeEnvironment;
  const databaseUrl = process.env.DATABASE_URL ?? process.env.ESTUDOS_DB_URL ?? "";
  const databaseAuthToken =
    process.env.DATABASE_AUTH_TOKEN ?? process.env.ESTUDOS_DB_TOKEN ?? "";
  const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "";
  const googleClientId = process.env.GOOGLE_CLIENT_ID ?? "";
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";
  const allowedEmails = splitList(process.env.ALLOWED_EMAILS).map((email) =>
    email.toLowerCase(),
  );
  const allowedSubjectIds = splitList(process.env.ALLOWED_SUBJECT_IDS);
  const appUrl = process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "";
  const localAuthBypass = asBoolean(process.env.LOCAL_AUTH_BYPASS);
  const localAuthOrigins = splitList(process.env.LOCAL_AUTH_ORIGINS);
  const timezone = process.env.APP_TIMEZONE ?? "America/Sao_Paulo";

  if (nodeEnv === "production") {
    const missing = [
      ["DATABASE_URL or ESTUDOS_DB_URL", databaseUrl],
      ["DATABASE_AUTH_TOKEN or ESTUDOS_DB_TOKEN", databaseAuthToken],
      ["AUTH_SECRET", authSecret],
      ["GOOGLE_CLIENT_ID", googleClientId],
      ["GOOGLE_CLIENT_SECRET", googleClientSecret],
      ["ALLOWED_EMAILS or ALLOWED_SUBJECT_IDS", allowedEmails.length || allowedSubjectIds.length],
      ["APP_URL", appUrl],
    ]
      .filter(([, value]) => !value)
      .map(([name]) => name);

    if (missing.length > 0) {
      throw new Error(`Missing required production environment variables: ${missing.join(", ")}`);
    }

    if (localAuthBypass) {
      throw new Error("LOCAL_AUTH_BYPASS must be disabled in production.");
    }
  }

  if (localAuthBypass && localAuthOrigins.length === 0) {
    throw new Error("LOCAL_AUTH_ORIGINS is required when LOCAL_AUTH_BYPASS is enabled.");
  }

  return {
    nodeEnv,
    databaseUrl,
    databaseAuthToken,
    authSecret,
    googleClientId,
    googleClientSecret,
    allowedEmails,
    allowedSubjectIds,
    appUrl,
    localAuthBypass,
    localAuthOrigins,
    timezone,
  };
}
