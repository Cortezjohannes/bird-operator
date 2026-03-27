import "server-only";

import crypto from "node:crypto";

import {
  getBearerTokenConfig,
  getOAuth1TokenSet,
  getOAuth2TokenSet,
} from "@/src/features/x-auth/server/auth-config";
import { sanitizeErrorMessage } from "@/src/features/x-auth/server/sanitize";
import type { XAuthMethod } from "@/src/features/x-auth/types";
import { createNormalizedError } from "@/src/features/x-client/server/errors";
import type { XNormalizedError } from "@/src/features/x-client/types";

const X_API_BASE_URL = "https://api.x.com";

function percentEncode(value: string) {
  return encodeURIComponent(value)
    .replace(/!/g, "%21")
    .replace(/\*/g, "%2A")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29");
}

function createOAuth1Header(
  method: string,
  rawUrl: string,
  queryParams: Record<string, string>,
) {
  const tokenSet = getOAuth1TokenSet();
  if (!tokenSet) {
    throw createNormalizedError({
      code: "auth_not_configured",
      status: 0,
      endpointLabel: rawUrl,
      authStrategy: "oauth1",
      message: "OAuth 1.0a credentials are not fully configured.",
    });
  }

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: tokenSet.appKey,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: tokenSet.accessToken,
    oauth_version: "1.0",
  };

  const url = new URL(rawUrl);
  for (const [key, value] of Object.entries(queryParams)) {
    url.searchParams.set(key, value);
  }

  const baseUrl = `${url.origin}${url.pathname}`;
  const signatureParams: Array<[string, string]> = [];

  url.searchParams.forEach((value, key) => {
    signatureParams.push([percentEncode(key), percentEncode(value)]);
  });

  Object.entries(oauthParams).forEach(([key, value]) => {
    signatureParams.push([percentEncode(key), percentEncode(value)]);
  });

  signatureParams.sort(([aKey, aValue], [bKey, bValue]) => {
    if (aKey === bKey) {
      return aValue.localeCompare(bValue);
    }
    return aKey.localeCompare(bKey);
  });

  const normalized = signatureParams
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  const baseString = [
    method.toUpperCase(),
    percentEncode(baseUrl),
    percentEncode(normalized),
  ].join("&");

  const signingKey = [
    percentEncode(tokenSet.appSecret),
    percentEncode(tokenSet.accessTokenSecret),
  ].join("&");

  oauthParams.oauth_signature = crypto
    .createHmac("sha1", signingKey)
    .update(baseString)
    .digest("base64");

  const header = Object.entries(oauthParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${percentEncode(key)}="${percentEncode(value)}"`)
    .join(", ");

  return { url: url.toString(), authorization: `OAuth ${header}` };
}

function createRequestHeaders(input: {
  authStrategy: XAuthMethod;
  method: "GET" | "POST" | "DELETE";
  rawUrl: string;
  queryParams: Record<string, string>;
  hasJsonBody: boolean;
}) {
  if (input.authStrategy === "oauth1") {
    const oauth = createOAuth1Header(
      input.method,
      input.rawUrl,
      input.queryParams,
    );
    return {
      url: oauth.url,
      headers: {
        Authorization: oauth.authorization,
        ...(input.hasJsonBody ? { "Content-Type": "application/json" } : {}),
      },
    };
  }

  if (input.authStrategy === "oauth2_user") {
    const tokenSet = getOAuth2TokenSet();
    if (!tokenSet) {
      throw createNormalizedError({
        code: "auth_not_configured",
        status: 0,
        endpointLabel: input.rawUrl,
        authStrategy: input.authStrategy,
        message: "OAuth 2.0 user token is not fully configured.",
      });
    }

    const url = new URL(input.rawUrl);
    for (const [key, value] of Object.entries(input.queryParams)) {
      url.searchParams.set(key, value);
    }

    return {
      url: url.toString(),
      headers: {
        Authorization: `Bearer ${tokenSet.accessToken}`,
        ...(input.hasJsonBody ? { "Content-Type": "application/json" } : {}),
      },
    };
  }

  if (input.authStrategy === "bearer") {
    const tokenSet = getBearerTokenConfig();
    if (!tokenSet) {
      throw createNormalizedError({
        code: "auth_not_configured",
        status: 0,
        endpointLabel: input.rawUrl,
        authStrategy: input.authStrategy,
        message: "Bearer token is not configured.",
      });
    }

    const url = new URL(input.rawUrl);
    for (const [key, value] of Object.entries(input.queryParams)) {
      url.searchParams.set(key, value);
    }

    return {
      url: url.toString(),
      headers: {
        Authorization: `Bearer ${tokenSet.bearerToken}`,
        ...(input.hasJsonBody ? { "Content-Type": "application/json" } : {}),
      },
    };
  }

  throw createNormalizedError({
    code: "auth_unsupported",
    status: 0,
    endpointLabel: input.rawUrl,
    authStrategy: input.authStrategy,
    message: `Unsupported auth strategy: ${input.authStrategy}`,
  });
}

function parseErrorMessage(body: unknown) {
  if (typeof body === "string") {
    return body;
  }
  if (!body || typeof body !== "object") {
    return "Unexpected X API response.";
  }
  if ("detail" in body && typeof body.detail === "string") {
    return body.detail;
  }
  if ("title" in body && typeof body.title === "string") {
    return body.title;
  }
  if ("errors" in body && Array.isArray(body.errors) && body.errors.length > 0) {
    const first = body.errors[0];
    if (first && typeof first === "object" && "message" in first) {
      return String(first.message);
    }
  }
  return JSON.stringify(body);
}

export async function performXRequest(input: {
  authStrategy: XAuthMethod;
  endpointLabel: string;
  path: string;
  method?: "GET" | "POST" | "DELETE";
  query?: Record<string, string>;
  body?: unknown;
}): Promise<
  | { ok: true; status: number; body: unknown }
  | { ok: false; error: XNormalizedError }
> {
  const method = input.method || "GET";
  const rawUrl = `${X_API_BASE_URL}${input.path}`;
  const query = input.query || {};
  const hasJsonBody = input.body !== undefined;

  try {
    const resolved = createRequestHeaders({
      authStrategy: input.authStrategy,
      method,
      rawUrl,
      queryParams: query,
      hasJsonBody,
    });

    const response = await fetch(resolved.url, {
      method,
      headers: resolved.headers,
      body: hasJsonBody ? JSON.stringify(input.body) : undefined,
      cache: "no-store",
    });

    const text = await response.text();
    let parsed: unknown = text;

    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    }

    if (!response.ok) {
      return {
        ok: false,
        error: createNormalizedError({
          code:
            response.status === 401
              ? "auth_failed"
              : response.status === 403
                ? "forbidden"
                : "x_api_error",
          status: response.status,
          endpointLabel: input.endpointLabel,
          authStrategy: input.authStrategy,
          message: parseErrorMessage(parsed),
          safeExcerpt:
            typeof parsed === "string" ? parsed : JSON.stringify(parsed),
        }),
      };
    }

    return { ok: true, status: response.status, body: parsed };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      "status" in error &&
      "endpointLabel" in error &&
      "authStrategy" in error
    ) {
      return { ok: false, error: error as XNormalizedError };
    }

    return {
      ok: false,
      error: createNormalizedError({
        code: "network_error",
        status: 0,
        endpointLabel: input.endpointLabel,
        authStrategy: input.authStrategy,
        message: sanitizeErrorMessage(error),
      }),
    };
  }
}
