import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const DEFAULT_CAPABILITIES = [
  "read_timeline",
  "read_mentions",
  "post_tweet",
  "reply_tweet",
  "quote_tweet",
  "like_tweet",
  "repost_tweet",
  "bookmark_tweet",
  "follow_user",
  "unfollow_user",
  "update_profile_text",
  "update_profile_media",
  "analytics_read",
];

const ENV_PATH = path.resolve(process.cwd(), process.env.OPERATOR_ENV_FILE || ".env.operator");
const SESSION_PATH = path.resolve(
  process.cwd(),
  process.env.OPERATOR_SESSION_FILE || ".operator-session.json",
);

function stripWrappingQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

export function loadDotEnvFile(filePath = ENV_PATH) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const entries = {};
  const source = fs.readFileSync(filePath, "utf8");
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = stripWrappingQuotes(line.slice(separatorIndex + 1).trim());
    entries[key] = value;
  }

  return entries;
}

export function loadOperatorConfig() {
  const fileEnv = loadDotEnvFile();
  const env = {
    ...fileEnv,
    ...process.env,
  };

  const appBaseUrl = env.APP_BASE_URL?.trim().replace(/\/+$/, "");
  const operatorLabel = env.OPERATOR_LABEL?.trim();
  const operatorInstanceId = env.OPERATOR_INSTANCE_ID?.trim();

  if (!appBaseUrl || !operatorLabel || !operatorInstanceId) {
    throw new Error(
      "APP_BASE_URL, OPERATOR_LABEL, and OPERATOR_INSTANCE_ID are required in .env.operator or process env.",
    );
  }

  let parsedBaseUrl;
  try {
    parsedBaseUrl = new URL(appBaseUrl);
  } catch {
    throw new Error("APP_BASE_URL must be a valid absolute URL.");
  }

  if (!/^https?:$/.test(parsedBaseUrl.protocol)) {
    throw new Error("APP_BASE_URL must use http or https.");
  }

  const requestedCapabilities = (env.OPERATOR_REQUESTED_CAPABILITIES || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return {
    appBaseUrl: parsedBaseUrl.toString().replace(/\/+$/, ""),
    operatorLabel,
    operatorInstanceId,
    requestedCapabilities:
      requestedCapabilities.length > 0 ? requestedCapabilities : DEFAULT_CAPABILITIES,
    requestedScopeSummary: env.OPERATOR_SCOPE_SUMMARY?.trim() || null,
    operatorFingerprint: {
      host: env.OPERATOR_HOST?.trim() || os.hostname(),
      instanceId: operatorInstanceId,
      runtime: env.OPERATOR_RUNTIME?.trim() || "operator-cli",
      ipHint: env.OPERATOR_REGION?.trim() || undefined,
      notes: env.OPERATOR_NOTES?.trim() || undefined,
    },
    envPath: ENV_PATH,
    sessionPath: SESSION_PATH,
  };
}

export function readStoredOperatorSession(filePath = SESSION_PATH) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function writeStoredOperatorSession(session, filePath = SESSION_PATH) {
  fs.writeFileSync(filePath, `${JSON.stringify(session, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
}

export function formatTimestamp(timestamp) {
  if (!timestamp) {
    return "n/a";
  }

  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? timestamp : date.toISOString();
}

export function createApiUrl(baseUrl, pathname, searchParams = {}) {
  const url = new URL(pathname, baseUrl);
  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}

export async function parseJsonResponse(response) {
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      data?.error?.message || data?.message || `Request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return data;
}

export function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function printHeader(title) {
  process.stdout.write(`\n${title}\n${"=".repeat(title.length)}\n`);
}

export function printKeyValue(label, value) {
  process.stdout.write(`${label}: ${value}\n`);
}

export function toStoredSession(input) {
  return {
    savedAt: new Date().toISOString(),
    appBaseUrl: input.appBaseUrl,
    operatorLabel: input.operatorLabel,
    operatorInstanceId: input.operatorInstanceId,
    requestId: input.requestId,
    leaseToken: input.leaseToken,
    session: {
      id: input.session.id,
      status: input.session.status,
      mode: input.session.mode,
      pairedAt: input.session.pairedAt,
      expiresAt: input.session.expiresAt,
      revokedAt: input.session.revokedAt,
      lastSeenAt: input.session.lastSeenAt,
      grantedCapabilities: input.session.grantedCapabilities,
      approvalRequiredCapabilities: input.session.approvalRequiredCapabilities,
      connectedXAccountId: input.session.connectedXAccountId,
    },
  };
}
