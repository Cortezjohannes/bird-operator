import "server-only";

import crypto from "node:crypto";

import {
  getBearerTokenConfig,
  getOAuth1TokenSet,
  getOAuth2TokenSet,
} from "@/src/features/x-auth/server/auth-config";
import { sanitizeErrorMessage } from "@/src/features/x-auth/server/sanitize";
import type { XAuthMethod } from "@/src/features/x-auth/types";

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
  queryParams: Record<string, string> = {},
) {
  const tokenSet = getOAuth1TokenSet();
  if (!tokenSet) {
    throw new Error("OAuth 1.0a credentials are not fully configured.");
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

  return {
    url: url.toString(),
    authorization: `OAuth ${header}`,
  };
}

function createHeaders(
  authMethod: XAuthMethod,
  method: string,
  rawUrl: string,
  queryParams: Record<string, string>,
  hasJsonBody: boolean,
) {
  if (authMethod === "oauth1") {
    const oauth = createOAuth1Header(method, rawUrl, queryParams);
    return {
      url: oauth.url,
      headers: {
        Authorization: oauth.authorization,
        ...(hasJsonBody ? { "Content-Type": "application/json" } : {}),
      },
    };
  }

  if (authMethod === "oauth2_user") {
    const tokenSet = getOAuth2TokenSet();
    if (!tokenSet) {
      throw new Error("OAuth 2.0 user token is not fully configured.");
    }

    const url = new URL(rawUrl);
    for (const [key, value] of Object.entries(queryParams)) {
      url.searchParams.set(key, value);
    }

    return {
      url: url.toString(),
      headers: {
        Authorization: `Bearer ${tokenSet.accessToken}`,
        ...(hasJsonBody ? { "Content-Type": "application/json" } : {}),
      },
    };
  }

  if (authMethod === "bearer") {
    const tokenSet = getBearerTokenConfig();
    if (!tokenSet) {
      throw new Error("Bearer token is not configured.");
    }

    const url = new URL(rawUrl);
    for (const [key, value] of Object.entries(queryParams)) {
      url.searchParams.set(key, value);
    }

    return {
      url: url.toString(),
      headers: {
        Authorization: `Bearer ${tokenSet.bearerToken}`,
        ...(hasJsonBody ? { "Content-Type": "application/json" } : {}),
      },
    };
  }

  throw new Error(`Unsupported auth method: ${authMethod}`);
}

export interface ProbeResponse {
  ok: boolean;
  status: number;
  body: unknown;
  sanitizedError: string | null;
}

export async function callXEndpoint({
  authMethod,
  path,
  method = "GET",
  query,
  body,
}: {
  authMethod: XAuthMethod;
  path: string;
  method?: "GET" | "POST" | "DELETE";
  query?: Record<string, string>;
  body?: unknown;
}): Promise<ProbeResponse> {
  try {
    const rawUrl = `${X_API_BASE_URL}${path}`;
    const hasJsonBody = body !== undefined;
    const resolved = createHeaders(
      authMethod,
      method,
      rawUrl,
      query || {},
      hasJsonBody,
    );

    const response = await fetch(resolved.url, {
      method,
      headers: resolved.headers,
      body: hasJsonBody ? JSON.stringify(body) : undefined,
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

    return {
      ok: response.ok,
      status: response.status,
      body: parsed,
      sanitizedError: response.ok
        ? null
        : sanitizeErrorMessage(
            typeof parsed === "string" ? parsed : JSON.stringify(parsed),
          ),
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      body: null,
      sanitizedError: sanitizeErrorMessage(error),
    };
  }
}
