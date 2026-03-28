export type XAuthMethod =
  | "demo"
  | "oauth1"
  | "oauth2_user"
  | "bearer"
  | "client_credentials"
  | "none";

export type XCapability =
  | "read_timeline"
  | "read_mentions"
  | "post_tweet"
  | "reply_tweet"
  | "quote_tweet"
  | "like_tweet"
  | "repost_tweet"
  | "bookmark_tweet"
  | "follow_user"
  | "unfollow_user"
  | "update_profile_text"
  | "update_profile_media"
  | "analytics_read";

export interface OAuth1TokenSet {
  appKey: string;
  appSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

export interface OAuth2TokenSet {
  accessToken: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
  expiresAt?: string | null;
  scopes?: string[];
}

export interface BearerTokenConfig {
  bearerToken: string;
}

export interface ClientCredentialsConfig {
  clientId: string;
  clientSecret: string;
}

export interface DetectedAuthMethod {
  key: XAuthMethod;
  label: string;
  configured: boolean;
  detectedFields: number;
  expectedFields: number;
  canBeUsedForLiveTests: boolean;
  summary: string;
}

export interface StoredTokenEnvelope {
  version: "v1";
  algorithm: "aes-256-gcm";
  iv: string;
  ciphertext: string;
  tag: string;
  keyId: "env";
}

export interface StoredOAuth2TokenBundle {
  accessToken: string;
  refreshToken?: string;
  expiresAt: string | null;
  scopes: string[];
  tokenType: string;
  createdAt: string;
  updatedAt: string;
}

export type TokenHealthStatus =
  | "missing"
  | "healthy"
  | "expiring"
  | "expired"
  | "error";

export interface XTokenHealthSummary {
  status: TokenHealthStatus;
  exists: boolean;
  hasRefreshToken: boolean;
  expiresAt: string | null;
  scopes: string[];
  authStrategy: XAuthMethod;
  lastValidatedAt: string | null;
  encryptionEnabled: boolean;
}

export interface StoredConnectedXAccount {
  appUserId: string;
  xUserId: string;
  username: string;
  displayName: string;
  connectedAt: string;
  lastValidatedAt: string | null;
  authMethodsAvailable: XAuthMethod[];
  tokenStatus: XTokenHealthSummary;
  tokenEnvelope: StoredTokenEnvelope;
}

export interface ConnectedXAccountSummary {
  appUserId: string;
  xUserId: string;
  username: string;
  displayName: string;
  connectedAt: string;
  lastValidatedAt: string | null;
  authMethodsAvailable: XAuthMethod[];
  tokenStatus: XTokenHealthSummary;
}

export interface CapabilityTestResult {
  capability: XCapability;
  supported: boolean;
  testedAt: string;
  mode: "demo" | "live";
  authMethodUsed: XAuthMethod;
  error: string | null;
}

export interface AuthStatusPayload {
  mode: "demo" | "live";
  requestedMode: "demo" | "live";
  isLiveReady: boolean;
  hasPartialLiveConfig: boolean;
  detectedAuthMethods: DetectedAuthMethod[];
  liveProbeSummary: string;
  connectedAccount: ConnectedXAccountSummary | null;
  oauthConfigured: boolean;
  callbackUrl: string | null;
  tokenHealth: XTokenHealthSummary | null;
  scopesSummary: string[];
  configWarnings: string[];
  persistenceBackend: "file" | "postgres";
  persistenceHealthy: boolean;
  persistenceSummary: string;
}
