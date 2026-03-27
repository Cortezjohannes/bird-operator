import type { CapabilityTestResult, XAuthMethod, XCapability } from "@/src/features/x-auth/types";

export interface XNormalizedError {
  code: string;
  status: number;
  endpointLabel: string;
  authStrategy: XAuthMethod;
  message: string;
  safeExcerpt: string;
}

export interface XLogEntry {
  id: string;
  timestamp: string;
  mode: "demo" | "live";
  operation: string;
  endpointLabel: string;
  authStrategy: XAuthMethod;
  success: boolean;
  status: number;
  message: string;
  actor?: string;
  targetType?: "tweet" | "user" | "profile" | "timeline" | "mention" | "system";
  targetId?: string | null;
  payloadSummary?: string;
  relatedTweetId?: string | null;
}

export interface XUserSummary {
  id: string;
  handle: string;
  name: string;
  description?: string;
  metrics?: Record<string, unknown>;
}

export interface XTimelineEntry {
  id: string;
  text: string;
  authorHandle: string;
  authorName: string;
  createdAt: string;
  metrics?: {
    replies?: number;
    reposts?: number;
    likes?: number;
    bookmarks?: number;
    impressions?: number;
  };
  unread?: boolean;
}

export interface XPostRecord {
  id: string;
  text: string;
  createdAt: string;
}

export interface XProfileTextInput {
  name?: string;
  url?: string;
  location?: string;
  description?: string;
}

export interface XProfileMediaInput {
  avatarMediaId?: string;
  bannerMediaId?: string;
}

export type XServiceResult<T> =
  | {
      ok: true;
      data: T;
      logEntry: XLogEntry;
      mode: "demo" | "live";
      authStrategy: XAuthMethod;
    }
  | {
      ok: false;
      error: XNormalizedError;
      logEntry: XLogEntry;
      mode: "demo" | "live";
      authStrategy: XAuthMethod;
    };

export interface XClient {
  getTimeline(): Promise<XServiceResult<XTimelineEntry[]>>;
  getMentions(): Promise<XServiceResult<XTimelineEntry[]>>;
  getUser(handle: string): Promise<XServiceResult<XUserSummary>>;
  createPost(
    text: string,
    media?: string[],
  ): Promise<XServiceResult<XPostRecord>>;
  createReply(tweetId: string, text: string): Promise<XServiceResult<XPostRecord>>;
  createQuote(tweetId: string, text: string): Promise<XServiceResult<XPostRecord>>;
  likeTweet(tweetId: string): Promise<XServiceResult<{ liked: boolean; tweetId: string }>>;
  repostTweet(
    tweetId: string,
  ): Promise<XServiceResult<{ reposted: boolean; tweetId: string }>>;
  bookmarkTweet(
    tweetId: string,
  ): Promise<XServiceResult<{ bookmarked: boolean; tweetId: string }>>;
  followUser(
    userId: string,
  ): Promise<XServiceResult<{ following: boolean; userId: string }>>;
  unfollowUser(
    userId: string,
  ): Promise<XServiceResult<{ following: boolean; userId: string }>>;
  updateProfileText(
    input: XProfileTextInput,
  ): Promise<XServiceResult<{ updated: boolean }>>;
  updateProfileMedia(
    input: XProfileMediaInput,
  ): Promise<XServiceResult<{ updated: boolean }>>;
  getCapabilities(options?: {
    force?: boolean;
  }): Promise<XServiceResult<CapabilityTestResult[]>>;
}

export interface XCapabilityProbeDefinition {
  capability: XCapability;
  endpointLabel: string;
  authStrategies: XAuthMethod[];
  execute: (client: XClient) => Promise<XServiceResult<unknown>>;
}
