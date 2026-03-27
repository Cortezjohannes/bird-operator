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
}
