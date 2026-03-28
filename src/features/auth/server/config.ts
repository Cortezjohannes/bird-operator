import type { AppAuthSetupState } from "@/src/features/auth/types";

function hasValue(value: string | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

export const APP_SESSION_COOKIE_NAME = "x_operator_session";

export function getAppBaseUrl() {
  return process.env.APP_BASE_URL || "";
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

export function isSecureCookieEnvironment() {
  return process.env.NODE_ENV === "production";
}

export function getAuthSetupState(): AppAuthSetupState {
  const missingFields: string[] = [];
  if (!getOwnerEmail()) {
    missingFields.push("APP_OWNER_EMAIL");
  }
  if (!getOwnerPasswordHash()) {
    missingFields.push("APP_OWNER_PASSWORD_HASH");
  }
  if (!getAppSessionSecret()) {
    missingFields.push("APP_SESSION_SECRET");
  }

  return {
    configured: missingFields.length === 0,
    baseUrlConfigured: hasValue(getAppBaseUrl()),
    missingFields,
    ownerEmail: getOwnerEmail() || null,
  };
}
