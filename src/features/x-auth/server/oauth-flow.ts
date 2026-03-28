import "server-only";

import crypto from "node:crypto";

import { cookies } from "next/headers";

import {
  getAppBaseUrl,
  isSecureCookieEnvironment,
} from "@/src/features/auth/server/config";
import { recordActionLog } from "@/src/features/logs/server/service";
import {
  getCurrentAppUserId,
  getCurrentConnectedXAccount,
  getStoredOAuth2TokenSetForCurrentUser,
  updateConnectedAccountValidation,
  upsertOAuth2Connection,
} from "@/src/features/x-auth/server/connected-account";
import { getXOAuthClientConfig } from "@/src/features/x-auth/server/auth-config";
import { isTokenEncryptionConfigured } from "@/src/features/x-auth/server/token-crypto";
import { sanitizeErrorMessage } from "@/src/features/x-auth/server/sanitize";
import type {
  StoredOAuth2TokenBundle,
} from "@/src/features/x-auth/types";

const OAUTH_FLOW_COOKIE = "x_operator_oauth_flow";
const X_AUTHORIZE_URL = "https://x.com/i/oauth2/authorize";
const X_TOKEN_URL = "https://api.x.com/2/oauth2/token";

interface OAuthFlowState {
  state: string;
  codeVerifier: string;
  createdAt: string;
}

function bytesToBase64Url(bytes: Buffer) {
  return bytes.toString("base64url");
}

function createPkceVerifier() {
  return bytesToBase64Url(crypto.randomBytes(32));
}

function createPkceChallenge(verifier: string) {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

function createStateToken() {
  return bytesToBase64Url(crypto.randomBytes(18));
}

async function setOAuthFlowCookie(flow: OAuthFlowState) {
  const store = await cookies();
  store.set(OAUTH_FLOW_COOKIE, JSON.stringify(flow), {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureCookieEnvironment(),
    path: "/",
    maxAge: 60 * 10,
  });
}

async function consumeOAuthFlowCookie() {
  const store = await cookies();
  const raw = store.get(OAUTH_FLOW_COOKIE)?.value;
  store.set(OAUTH_FLOW_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureCookieEnvironment(),
    path: "/",
    maxAge: 0,
  });

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as OAuthFlowState;
  } catch {
    return null;
  }
}

function createBasicAuthHeader(clientId: string, clientSecret: string) {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

async function exchangeCodeForToken(input: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}) {
  const config = getXOAuthClientConfig();
  if (!config.configured) {
    throw new Error("X OAuth is not configured for hosted connect.");
  }

  const params = new URLSearchParams({
    code: input.code,
    grant_type: "authorization_code",
    client_id: config.clientId,
    redirect_uri: input.redirectUri,
    code_verifier: input.codeVerifier,
  });

  const response = await fetch(X_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: createBasicAuthHeader(config.clientId, config.clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
    cache: "no-store",
  });

  const text = await response.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }

  if (!response.ok) {
    throw new Error(
      sanitizeErrorMessage(
        typeof parsed === "string" ? parsed : JSON.stringify(parsed),
      ),
    );
  }

  return parsed as {
    token_type?: string;
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };
}

async function refreshCurrentUserTokenBundle(bundle: StoredOAuth2TokenBundle) {
  const config = getXOAuthClientConfig();
  if (!config.configured || !bundle.refreshToken) {
    return null;
  }

  const params = new URLSearchParams({
    refresh_token: bundle.refreshToken,
    grant_type: "refresh_token",
    client_id: config.clientId,
  });

  const response = await fetch(X_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: createBasicAuthHeader(config.clientId, config.clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
    cache: "no-store",
  });

  const text = await response.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }

  if (!response.ok) {
    return null;
  }

  const payload = parsed as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
  };

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token || bundle.refreshToken,
    expiresAt: payload.expires_in
      ? new Date(Date.now() + payload.expires_in * 1000).toISOString()
      : bundle.expiresAt,
    scopes: payload.scope ? payload.scope.split(" ") : bundle.scopes,
    tokenType: payload.token_type || bundle.tokenType,
    createdAt: bundle.createdAt,
    updatedAt: new Date().toISOString(),
  } satisfies StoredOAuth2TokenBundle;
}

export async function createXConnectUrl() {
  const config = getXOAuthClientConfig();
  if (!config.configured) {
    return {
      ok: false as const,
      error: "Hosted X OAuth is not configured. Set APP_BASE_URL or APP_URL, plus X_CLIENT_ID and X_CLIENT_SECRET.",
    };
  }

  if (!isTokenEncryptionConfigured()) {
    return {
      ok: false as const,
      error: "X token encryption is not configured. Set X_TOKEN_ENCRYPTION_KEY before connecting a live account.",
    };
  }

  const userId = await getCurrentAppUserId();
  if (!userId) {
    return {
      ok: false as const,
      error: "App session is required before connecting X.",
    };
  }

  const codeVerifier = createPkceVerifier();
  const state = createStateToken();
  await setOAuthFlowCookie({
    state,
    codeVerifier,
    createdAt: new Date().toISOString(),
  });

  const url = new URL(X_AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.callbackUrl);
  url.searchParams.set("scope", config.scopes.join(" "));
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", createPkceChallenge(codeVerifier));
  url.searchParams.set("code_challenge_method", "S256");

  await recordActionLog({
    actor: userId,
    actionType: "x.connect.start",
    targetType: "system",
    payloadSummary: "Started hosted X OAuth connect flow.",
    resultStatus: "queued",
    resultExcerpt: "Redirecting owner to X authorization screen.",
    authMethod: "system",
  });

  return {
    ok: true as const,
    url: url.toString(),
  };
}

export async function handleXOAuthCallback(input: {
  code?: string | null;
  state?: string | null;
  error?: string | null;
}) {
  const appUserId = await getCurrentAppUserId();
  if (!appUserId) {
    return {
      ok: false as const,
      message: "App session is required before completing X connect.",
    };
  }

  if (input.error) {
    await recordActionLog({
      actor: appUserId,
      actionType: "x.connect.callback",
      targetType: "system",
      payloadSummary: "X OAuth callback returned an error.",
      resultStatus: "failed",
      resultExcerpt: sanitizeErrorMessage(input.error),
      authMethod: "system",
    });
    return {
      ok: false as const,
      message: "X authorization was denied or failed.",
    };
  }

  const flow = await consumeOAuthFlowCookie();
  if (!input.code || !input.state || !flow || flow.state !== input.state) {
    return {
      ok: false as const,
      message: "OAuth callback state could not be verified.",
    };
  }

  try {
    const config = getXOAuthClientConfig();
    const tokenResponse = await exchangeCodeForToken({
      code: input.code,
      codeVerifier: flow.codeVerifier,
      redirectUri: config.callbackUrl,
    });

    const bundle: StoredOAuth2TokenBundle = {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt: tokenResponse.expires_in
        ? new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString()
        : null,
      scopes: tokenResponse.scope ? tokenResponse.scope.split(" ") : config.scopes,
      tokenType: tokenResponse.token_type || "bearer",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const me = await fetchAuthenticatedUserProfile(bundle.accessToken);
    await upsertOAuth2Connection({
      appUserId,
      xUserId: me.id,
      username: me.username,
      displayName: me.name,
      bundle,
      authMethodsAvailable: ["oauth2_user"],
      lastValidatedAt: new Date().toISOString(),
    });

    await recordActionLog({
      actor: appUserId,
      actionType: "x.connect.complete",
      targetType: "user",
      targetId: me.id,
      payloadSummary: `Connected X account @${me.username}`,
      resultStatus: "success",
      resultExcerpt: "Hosted X OAuth completed successfully.",
      authMethod: "oauth2_user",
    });

    return {
      ok: true as const,
      username: me.username,
    };
  } catch (error) {
    await recordActionLog({
      actor: appUserId,
      actionType: "x.connect.complete",
      targetType: "system",
      payloadSummary: "Hosted X OAuth callback failed.",
      resultStatus: "failed",
      resultExcerpt: sanitizeErrorMessage(error),
      authMethod: "system",
    });

    return {
      ok: false as const,
      message: sanitizeErrorMessage(error),
    };
  }
}

async function fetchAuthenticatedUserProfile(accessToken: string) {
  const response = await fetch("https://api.x.com/2/users/me?user.fields=profile_image_url", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  const text = await response.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }

  if (!response.ok || !parsed || typeof parsed !== "object" || !("data" in parsed)) {
    throw new Error("Unable to validate connected X account.");
  }

  const data = (parsed as { data: Record<string, unknown> }).data;
  return {
    id: String(data.id || ""),
    username: String(data.username || ""),
    name: String(data.name || data.username || ""),
  };
}

export async function refreshCurrentUserOAuth2TokenIfNeeded() {
  const existing = await getStoredOAuth2TokenSetForCurrentUser();
  const connected = await getCurrentConnectedXAccount();
  if (!existing || !connected) {
    return null;
  }

  if (!existing.expiresAt) {
    return existing;
  }

  const msRemaining = new Date(existing.expiresAt).getTime() - Date.now();
  if (msRemaining > 5 * 60 * 1000) {
    return existing;
  }

  const currentBundle = {
    accessToken: existing.accessToken,
    refreshToken: existing.refreshToken,
    expiresAt: existing.expiresAt || null,
    scopes: existing.scopes || [],
    tokenType: "bearer",
    createdAt: connected.connectedAt,
    updatedAt: connected.lastValidatedAt || connected.connectedAt,
  } satisfies StoredOAuth2TokenBundle;

  const refreshed = await refreshCurrentUserTokenBundle(currentBundle);
  if (!refreshed) {
    return existing;
  }

  const me = await fetchAuthenticatedUserProfile(refreshed.accessToken);
  await updateConnectedAccountValidation({
    xUserId: me.id,
    username: me.username,
    displayName: me.name,
    bundle: refreshed,
  });

  return {
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken,
    expiresAt: refreshed.expiresAt,
    scopes: refreshed.scopes,
  };
}

export async function validateCurrentConnectedAccount() {
  const bundle = await refreshCurrentUserOAuth2TokenIfNeeded();
  if (!bundle) {
    return null;
  }

  let validatedProfile: { id: string; username: string; name: string };
  try {
    validatedProfile = await fetchAuthenticatedUserProfile(bundle.accessToken);
  } catch {
    return null;
  }

  await updateConnectedAccountValidation({
    xUserId: validatedProfile.id,
    username: validatedProfile.username,
    displayName: validatedProfile.name,
    bundle: {
      accessToken: bundle.accessToken,
      refreshToken: bundle.refreshToken,
      expiresAt: bundle.expiresAt || null,
      scopes: bundle.scopes || [],
      tokenType: "bearer",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  });

  return getCurrentConnectedXAccount();
}

export function getOAuthHostingState() {
  const config = getXOAuthClientConfig();
  const warnings: string[] = [];

  if (!config.callbackUrl) {
    warnings.push("APP_BASE_URL or APP_URL is missing or invalid, so the hosted callback URL cannot be derived.");
  }
  if (!config.configured) {
    warnings.push("Hosted X OAuth is not fully configured. Set APP_BASE_URL or APP_URL, plus X_CLIENT_ID and X_CLIENT_SECRET.");
  }
  if (!isTokenEncryptionConfigured()) {
    warnings.push("X_TOKEN_ENCRYPTION_KEY is missing or too short for encrypted token storage.");
  }

  return {
    configured: config.configured,
    callbackUrl: config.callbackUrl || null,
    baseUrl: getAppBaseUrl() || null,
    encryptionEnabled: isTokenEncryptionConfigured(),
    warnings,
  };
}
