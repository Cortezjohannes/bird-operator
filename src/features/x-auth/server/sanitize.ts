import "server-only";

const secretEnvKeys = [
  "APP_SESSION_SECRET",
  "X_APP_KEY",
  "X_APP_SECRET",
  "X_ACCESS_TOKEN",
  "X_ACCESS_TOKEN_SECRET",
  "X_BEARER_TOKEN",
  "X_CLIENT_ID",
  "X_CLIENT_SECRET",
  "X_TOKEN_ENCRYPTION_KEY",
] as const;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function sanitizeErrorMessage(input: unknown) {
  let message =
    input instanceof Error
      ? input.message
      : typeof input === "string"
        ? input
        : "Unknown error";

  for (const key of secretEnvKeys) {
    const value = process.env[key];
    if (value && value.length > 3) {
      message = message.replaceAll(new RegExp(escapeRegExp(value), "g"), "[redacted]");
    }
  }

  return message
    .replace(/(Bearer\s+)[A-Za-z0-9._~-]+/gi, "$1[redacted]")
    .replace(/(Basic\s+)[A-Za-z0-9+/=]+/gi, "$1[redacted]")
    .replace(/(oauth_(?:token|signature|consumer_key)=)[^&,\\s]+/gi, "$1[redacted]")
    .replace(/(code_verifier=)[^&\\s]+/gi, "$1[redacted]")
    .replace(/(refresh_token=)[^&\\s]+/gi, "$1[redacted]")
    .replace(/[A-Za-z0-9_-]{24,}\.[A-Za-z0-9._-]{10,}/g, "[redacted]")
    .replace(/[A-Za-z0-9]{32,}/g, "[redacted]")
    .slice(0, 220);
}
