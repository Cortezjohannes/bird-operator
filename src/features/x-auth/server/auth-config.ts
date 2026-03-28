import "server-only";

import type {
  BearerTokenConfig,
  ClientCredentialsConfig,
  OAuth1TokenSet,
} from "@/src/features/x-auth/types";
import { getAppBaseUrl } from "@/src/features/auth/server/config";

function hasValue(value: string | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

export function getOAuth1TokenSet(): OAuth1TokenSet | null {
  const tokenSet = {
    appKey: process.env.X_APP_KEY || "",
    appSecret: process.env.X_APP_SECRET || "",
    accessToken: process.env.X_ACCESS_TOKEN || "",
    accessTokenSecret: process.env.X_ACCESS_TOKEN_SECRET || "",
  };

  return Object.values(tokenSet).every(hasValue) ? tokenSet : null;
}

export function getBearerTokenConfig(): BearerTokenConfig | null {
  const bearerToken = process.env.X_BEARER_TOKEN || "";
  return hasValue(bearerToken) ? { bearerToken } : null;
}

export function getClientCredentialsConfig(): ClientCredentialsConfig | null {
  const clientId = process.env.X_CLIENT_ID || "";
  const clientSecret = process.env.X_CLIENT_SECRET || "";
  return hasValue(clientId) && hasValue(clientSecret)
    ? { clientId, clientSecret }
    : null;
}

export function getXOAuthCallbackUrl() {
  const baseUrl = getAppBaseUrl();
  if (!hasValue(baseUrl)) {
    return "";
  }

  return `${baseUrl.replace(/\/$/, "")}/api/x/callback`;
}

export function getXOAuthScopes() {
  const configured = process.env.X_OAUTH_SCOPES || "";
  if (hasValue(configured)) {
    return configured
      .split(/[,\s]+/)
      .map((scope) => scope.trim())
      .filter(Boolean);
  }

  return [
    "tweet.read",
    "users.read",
    "tweet.write",
    "like.write",
    "follows.write",
    "bookmark.write",
    "offline.access",
  ];
}

export function getXOAuthClientConfig() {
  const clientId = process.env.X_CLIENT_ID || "";
  const clientSecret = process.env.X_CLIENT_SECRET || "";
  const callbackUrl = getXOAuthCallbackUrl();

  return {
    clientId,
    clientSecret,
    callbackUrl,
    scopes: getXOAuthScopes(),
    configured:
      hasValue(clientId) && hasValue(clientSecret) && hasValue(callbackUrl),
  };
}
