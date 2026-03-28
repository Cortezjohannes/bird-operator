import type { AppAuthSetupState } from "@/src/features/auth/types";

function hasValue(value: string | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

function parseUrl(value: string) {
  if (!hasValue(value)) {
    return null;
  }

  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function getRailwayPublicUrl() {
  const domain = process.env.RAILWAY_PUBLIC_DOMAIN?.trim();
  if (!domain) {
    return "";
  }

  return `https://${domain}`;
}

export const APP_SESSION_COOKIE_NAME = "x_operator_session";

export function getAppBaseUrl() {
  const parsed = parseUrl(
    process.env.APP_BASE_URL ||
      process.env.APP_URL ||
      process.env.NEXTAUTH_URL ||
      getRailwayPublicUrl(),
  );
  return parsed ? parsed.toString().replace(/\/$/, "") : "";
}

export function getAppBaseOrigin() {
  const parsed = parseUrl(getAppBaseUrl());
  return parsed ? parsed.origin : "";
}

export function getAppSessionSecret() {
  const secret = process.env.APP_SESSION_SECRET || "";
  return secret.length >= 32 ? secret : "";
}

export function getOwnerEmail() {
  const email = process.env.APP_OWNER_EMAIL || "";
  return hasValue(email) ? email.trim().toLowerCase() : "";
}

export function getOwnerPasswordHash() {
  const hash = process.env.APP_OWNER_PASSWORD_HASH || "";
  return hasValue(hash) ? hash.trim() : "";
}

export function getSessionTtlSeconds() {
  const value = Number(process.env.APP_SESSION_TTL_HOURS || "12");
  if (!Number.isFinite(value) || value <= 0) {
    return 60 * 60 * 12;
  }
  return Math.round(value * 60 * 60);
}

export function isRailwayEnvironment() {
  return Boolean(
    process.env.RAILWAY_ENVIRONMENT_NAME ||
      process.env.RAILWAY_PROJECT_ID ||
      process.env.RAILWAY_SERVICE_ID,
  );
}

export function getDatabaseUrl() {
  return process.env.DATABASE_URL?.trim() || "";
}

export function isSecureCookieEnvironment() {
  return process.env.NODE_ENV === "production";
}

export function getTrustedHosts() {
  const fromEnv = (process.env.APP_TRUSTED_HOSTS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const baseUrl = parseUrl(getAppBaseUrl());
  const hosts = new Set<string>(fromEnv);

  if (baseUrl?.host) {
    hosts.add(baseUrl.host.toLowerCase());
  }

  return Array.from(hosts);
}

export function isTrustedOrigin(origin: string | null | undefined) {
  if (!origin) {
    return false;
  }

  const parsed = parseUrl(origin);
  if (!parsed) {
    return false;
  }

  const trustedHosts = getTrustedHosts();
  if (trustedHosts.length === 0) {
    return false;
  }

  return trustedHosts.includes(parsed.host.toLowerCase());
}

export function getAuthSetupState(): AppAuthSetupState {
  const missingFields: string[] = [];
  const configWarnings: string[] = [];
  const baseUrl = parseUrl(getAppBaseUrl());

  if (!getOwnerEmail()) {
    missingFields.push("APP_OWNER_EMAIL");
  }
  if (!getOwnerPasswordHash()) {
    missingFields.push("APP_OWNER_PASSWORD_HASH");
  }
  if (!getAppSessionSecret()) {
    missingFields.push("APP_SESSION_SECRET");
  }
  if (isSecureCookieEnvironment() && !getDatabaseUrl()) {
    missingFields.push("DATABASE_URL");
  }

  if (!baseUrl) {
    configWarnings.push("APP_BASE_URL or APP_URL is missing or invalid. Hosted OAuth and approval links need an absolute public URL.");
  } else {
    if (isSecureCookieEnvironment() && baseUrl.protocol !== "https:") {
      configWarnings.push("The public app URL should use https in production.");
    }
    if (isSecureCookieEnvironment() && /localhost|127\.0\.0\.1/.test(baseUrl.hostname)) {
      configWarnings.push("The public app URL still points at localhost. Update it before public deployment.");
    }
  }

  if (isSecureCookieEnvironment() && getTrustedHosts().length === 0) {
    configWarnings.push("APP_TRUSTED_HOSTS is not set. Same-origin enforcement will fall back to APP_BASE_URL only.");
  }
  if (isRailwayEnvironment() && !getDatabaseUrl()) {
    configWarnings.push("Railway deployment should attach a Postgres service and set DATABASE_URL.");
  }

  const configured = missingFields.length === 0;
  const productionReady = configured && configWarnings.length === 0;

  return {
    configured,
    baseUrlConfigured: Boolean(baseUrl),
    missingFields,
    configWarnings,
    productionReady,
  };
}
