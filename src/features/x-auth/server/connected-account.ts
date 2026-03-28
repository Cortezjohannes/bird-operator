import "server-only";

import { requireCurrentOwnerSession } from "@/src/features/auth/server/current-session";
import {
  deleteConnectedXAccount,
  getConnectedXAccount,
  upsertConnectedXAccount,
} from "@/src/features/operator-store/server/store";
import { sanitizeErrorMessage } from "@/src/features/x-auth/server/sanitize";
import {
  getBearerTokenConfig,
  getClientCredentialsConfig,
  getOAuth1TokenSet,
  getXOAuthClientConfig,
} from "@/src/features/x-auth/server/auth-config";
import {
  decryptOAuth2TokenBundle,
  encryptOAuth2TokenBundle,
  isTokenEncryptionConfigured,
} from "@/src/features/x-auth/server/token-crypto";
import type {
  ConnectedXAccountSummary,
  DetectedAuthMethod,
  StoredConnectedXAccount,
  StoredOAuth2TokenBundle,
  XAuthMethod,
  XConnectionState,
  XTokenHealthSummary,
} from "@/src/features/x-auth/types";

function countDefined(values: Array<string | undefined>) {
  return values.filter((value) => typeof value === "string" && value.trim().length > 0).length;
}

function computeTokenStatus(input: {
  bundle: StoredOAuth2TokenBundle | null;
  lastValidatedAt?: string | null;
}): XTokenHealthSummary {
  if (!input.bundle) {
    return {
      status: "missing",
      exists: false,
      hasRefreshToken: false,
      expiresAt: null,
      scopes: [],
      authStrategy: "oauth2_user",
      lastValidatedAt: input.lastValidatedAt || null,
      encryptionEnabled: isTokenEncryptionConfigured(),
    };
  }

  const expiresAt = input.bundle.expiresAt;
  let status: XTokenHealthSummary["status"] = "healthy";

  if (expiresAt) {
    const msRemaining = new Date(expiresAt).getTime() - Date.now();
    if (msRemaining <= 0) {
      status = "expired";
    } else if (msRemaining <= 15 * 60 * 1000) {
      status = "expiring";
    }
  }

  return {
    status,
    exists: true,
    hasRefreshToken: Boolean(input.bundle.refreshToken),
    expiresAt,
    scopes: input.bundle.scopes,
    authStrategy: "oauth2_user",
    lastValidatedAt: input.lastValidatedAt || null,
    encryptionEnabled: isTokenEncryptionConfigured(),
  };
}

function summarizeAccount(record: StoredConnectedXAccount): ConnectedXAccountSummary {
  const tokenStatus = resolveStoredTokenHealth(record);
  return {
    appUserId: record.appUserId,
    xUserId: record.xUserId,
    username: record.username,
    displayName: record.displayName,
    connectedAt: record.connectedAt,
    lastValidatedAt: record.lastValidatedAt,
    authMethodsAvailable: record.authMethodsAvailable,
    tokenStatus,
  };
}

function resolveStoredTokenHealth(record: StoredConnectedXAccount): XTokenHealthSummary {
  const decrypted = decryptOAuth2TokenBundle(record.tokenEnvelope);
  if (decrypted) {
    return computeTokenStatus({
      bundle: decrypted,
      lastValidatedAt: record.lastValidatedAt,
    });
  }

  return {
    ...record.tokenStatus,
    status: record.tokenStatus.exists ? "error" : "missing",
    exists: false,
    hasRefreshToken: false,
    expiresAt: null,
    scopes: [],
    lastValidatedAt: record.lastValidatedAt || null,
    encryptionEnabled: isTokenEncryptionConfigured(),
  };
}

interface ConnectedAccountLookupOptions {
  appUserId?: string | null;
  expectedXUserId?: string | null;
}

export async function getCurrentAppUserId() {
  const session = await requireCurrentOwnerSession().catch(() => null);
  return session?.user.id || null;
}

export async function getScopedConnectedXAccount(
  options?: ConnectedAccountLookupOptions,
) {
  const userId = options?.appUserId || (await getCurrentAppUserId());
  if (!userId) {
    return null;
  }

  const account = await getConnectedXAccount(userId);
  if (!account) {
    return null;
  }

  if (options?.expectedXUserId && account.xUserId !== options.expectedXUserId) {
    return null;
  }

  return account;
}

export async function getCurrentConnectedXAccount() {
  return getScopedConnectedXAccount();
}

export async function getCurrentConnectedXAccountSummary() {
  const account = await getCurrentConnectedXAccount();
  return account ? summarizeAccount(account) : null;
}

export async function getScopedConnectedXAccountSummary(
  options?: ConnectedAccountLookupOptions,
) {
  const account = await getScopedConnectedXAccount(options);
  return account ? summarizeAccount(account) : null;
}

export async function getStoredOAuth2TokenSetForCurrentUser() {
  const account = await getCurrentConnectedXAccount();
  if (!account) {
    return null;
  }

  const bundle = decryptOAuth2TokenBundle(account.tokenEnvelope);
  if (!bundle) {
    return null;
  }

  return {
    accessToken: bundle.accessToken,
    refreshToken: bundle.refreshToken,
    expiresAt: bundle.expiresAt,
    scopes: bundle.scopes,
  };
}

export async function getStoredOAuth2TokenSetForScope(
  options?: ConnectedAccountLookupOptions,
) {
  const account = await getScopedConnectedXAccount(options);
  if (!account) {
    return null;
  }

  const bundle = decryptOAuth2TokenBundle(account.tokenEnvelope);
  if (!bundle) {
    return null;
  }

  return {
    accessToken: bundle.accessToken,
    refreshToken: bundle.refreshToken,
    expiresAt: bundle.expiresAt,
    scopes: bundle.scopes,
  };
}

export async function upsertOAuth2Connection(input: {
  appUserId: string;
  xUserId: string;
  username: string;
  displayName: string;
  bundle: StoredOAuth2TokenBundle;
  authMethodsAvailable?: XAuthMethod[];
  lastValidatedAt?: string | null;
}) {
  const account: StoredConnectedXAccount = {
    appUserId: input.appUserId,
    xUserId: input.xUserId,
    username: input.username,
    displayName: input.displayName,
    connectedAt: new Date().toISOString(),
    lastValidatedAt: input.lastValidatedAt || null,
    authMethodsAvailable: input.authMethodsAvailable || ["oauth2_user"],
    tokenStatus: computeTokenStatus({
      bundle: input.bundle,
      lastValidatedAt: input.lastValidatedAt,
    }),
    tokenEnvelope: encryptOAuth2TokenBundle(input.bundle),
  };

  return upsertConnectedXAccount(account);
}

export async function updateConnectedAccountValidation(input: {
  xUserId: string;
  username: string;
  displayName: string;
  bundle: StoredOAuth2TokenBundle;
}) {
  const userId = await getCurrentAppUserId();
  if (!userId) {
    throw new Error("App session is missing.");
  }

  const existing = await getConnectedXAccount(userId);
  return upsertConnectedXAccount({
    appUserId: userId,
    xUserId: input.xUserId,
    username: input.username,
    displayName: input.displayName,
    connectedAt: existing?.connectedAt || new Date().toISOString(),
    lastValidatedAt: new Date().toISOString(),
    authMethodsAvailable: existing?.authMethodsAvailable || ["oauth2_user"],
    tokenStatus: computeTokenStatus({
      bundle: input.bundle,
      lastValidatedAt: new Date().toISOString(),
    }),
    tokenEnvelope: encryptOAuth2TokenBundle(input.bundle),
  });
}

export async function disconnectCurrentXAccount() {
  const session = await requireCurrentOwnerSession().catch(() => null);
  const userId = session?.user.id || null;
  if (!userId) {
    return null;
  }
  return deleteConnectedXAccount(userId);
}

export async function getDetectedAuthMethods(
  options?: ConnectedAccountLookupOptions,
): Promise<DetectedAuthMethod[]> {
  const connectedBundle = await getStoredOAuth2TokenSetForScope(options);
  const oauthConfig = getXOAuthClientConfig();

  return [
    {
      key: "oauth1",
      label: "OAuth 1.0a user context",
      configured: getOAuth1TokenSet() !== null,
      detectedFields: countDefined([
        process.env.X_APP_KEY,
        process.env.X_APP_SECRET,
        process.env.X_ACCESS_TOKEN,
        process.env.X_ACCESS_TOKEN_SECRET,
      ]),
      expectedFields: 4,
      canBeUsedForLiveTests: getOAuth1TokenSet() !== null,
      summary: "App key/secret plus access token and token secret.",
    },
    {
      key: "oauth2_user",
      label: "OAuth 2.0 connected user token",
      configured: connectedBundle !== null,
      detectedFields: connectedBundle
        ? 1 + (connectedBundle.refreshToken ? 1 : 0)
        : 0,
      expectedFields: 1,
      canBeUsedForLiveTests: connectedBundle !== null,
      summary: oauthConfig.configured
        ? "Connected account token stored server-side via hosted OAuth."
        : "OAuth client config is missing, so hosted connect is unavailable.",
    },
    {
      key: "bearer",
      label: "Bearer token",
      configured: getBearerTokenConfig() !== null,
      detectedFields: countDefined([process.env.X_BEARER_TOKEN]),
      expectedFields: 1,
      canBeUsedForLiveTests: getBearerTokenConfig() !== null,
      summary: "Read-oriented app token. Useful for limited live diagnostics.",
    },
    {
      key: "client_credentials",
      label: "Client ID / client secret",
      configured: getClientCredentialsConfig() !== null,
      detectedFields: countDefined([
        process.env.X_CLIENT_ID,
        process.env.X_CLIENT_SECRET,
      ]),
      expectedFields: 2,
      canBeUsedForLiveTests: false,
      summary: "OAuth client credentials for hosted web-app connect flow.",
    },
  ];
}

export async function getDetectedAuthMethodsForCurrentUser(): Promise<DetectedAuthMethod[]> {
  return getDetectedAuthMethods();
}

export async function getTokenHealthForCurrentUser() {
  const account = await getCurrentConnectedXAccount();
  return account ? resolveStoredTokenHealth(account) : null;
}

export function getConnectionState(input: {
  account: ConnectedXAccountSummary | null;
  tokenHealth: XTokenHealthSummary | null;
}) : XConnectionState {
  if (!input.account) {
    return "not_connected";
  }

  if (!input.tokenHealth?.exists || input.tokenHealth.status === "missing" || input.tokenHealth.status === "error") {
    return "linked_token_missing";
  }

  if (input.tokenHealth.status === "expired") {
    return "token_expired";
  }

  const requiredScopes = ["tweet.read", "users.read"];
  const hasBaselineScopes = requiredScopes.every((scope) => input.tokenHealth?.scopes.includes(scope));
  if (!hasBaselineScopes) {
    return "scopes_insufficient";
  }

  return "token_healthy";
}

export function createMissingConnectionMessage(error?: unknown) {
  return sanitizeErrorMessage(
    error || "No connected X account is available for the current app user.",
  );
}

export function buildConnectedAccountSummary(
  account: StoredConnectedXAccount | null,
) {
  return account ? summarizeAccount(account) : null;
}
