import "server-only";

import type {
  BearerTokenConfig,
  ClientCredentialsConfig,
  DetectedAuthMethod,
  OAuth1TokenSet,
  OAuth2TokenSet,
} from "@/src/features/x-auth/types";

function hasValue(value: string | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

function countDefined(values: Array<string | undefined>) {
  return values.filter(hasValue).length;
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

export function getOAuth2TokenSet(): OAuth2TokenSet | null {
  const accessToken = process.env.X_OAUTH2_ACCESS_TOKEN || "";
  if (!hasValue(accessToken)) {
    return null;
  }

  return {
    accessToken,
    refreshToken: process.env.X_OAUTH2_REFRESH_TOKEN || undefined,
    clientId: process.env.X_CLIENT_ID || undefined,
    clientSecret: process.env.X_CLIENT_SECRET || undefined,
  };
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

export function getDetectedAuthMethods(): DetectedAuthMethod[] {
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
      label: "OAuth 2.0 user token set",
      configured: getOAuth2TokenSet() !== null,
      detectedFields: countDefined([
        process.env.X_OAUTH2_ACCESS_TOKEN,
        process.env.X_OAUTH2_REFRESH_TOKEN,
        process.env.X_CLIENT_ID,
        process.env.X_CLIENT_SECRET,
      ]),
      expectedFields: 1,
      canBeUsedForLiveTests: getOAuth2TokenSet() !== null,
      summary: "User access token with optional refresh token and client credentials.",
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
      summary: "Detected and modeled, but not used alone for live probes in this phase.",
    },
  ];
}
