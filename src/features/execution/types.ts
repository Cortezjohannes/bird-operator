import type { XAuthMethod, XCapability } from "@/src/features/x-auth/types";
import type {
  XNormalizedError,
  XPostRecord,
  XProfileMediaInput,
  XProfileTextInput,
  XServiceResult,
} from "@/src/features/x-client/types";

export type ExecutionActionType =
  | "getTimeline"
  | "getMentions"
  | "getUser"
  | "createPost"
  | "createReply"
  | "createQuote"
  | "likeTweet"
  | "repostTweet"
  | "bookmarkTweet"
  | "followUser"
  | "unfollowUser"
  | "updateProfileText"
  | "updateProfileMedia"
  | "getCapabilities";

export type ExecutionPayloadMap = {
  getTimeline: undefined;
  getMentions: undefined;
  getUser: { handle: string };
  createPost: { text: string; media?: string[] };
  createReply: { tweetId: string; text: string };
  createQuote: { tweetId: string; text: string };
  likeTweet: { tweetId: string };
  repostTweet: { tweetId: string };
  bookmarkTweet: { tweetId: string };
  followUser: { userId: string };
  unfollowUser: { userId: string };
  updateProfileText: XProfileTextInput;
  updateProfileMedia: XProfileMediaInput;
  getCapabilities: { force?: boolean } | undefined;
};

export type ExecutionResponseMap = {
  getTimeline: Awaited<ReturnType<import("@/src/features/x-client/types").XClient["getTimeline"]>>;
  getMentions: Awaited<ReturnType<import("@/src/features/x-client/types").XClient["getMentions"]>>;
  getUser: Awaited<ReturnType<import("@/src/features/x-client/types").XClient["getUser"]>>;
  createPost: XServiceResult<XPostRecord>;
  createReply: XServiceResult<XPostRecord>;
  createQuote: XServiceResult<XPostRecord>;
  likeTweet: XServiceResult<{ liked: boolean; tweetId: string }>;
  repostTweet: XServiceResult<{ reposted: boolean; tweetId: string }>;
  bookmarkTweet: XServiceResult<{ bookmarked: boolean; tweetId: string }>;
  followUser: XServiceResult<{ following: boolean; userId: string }>;
  unfollowUser: XServiceResult<{ following: boolean; userId: string }>;
  updateProfileText: XServiceResult<{ updated: boolean }>;
  updateProfileMedia: XServiceResult<{ updated: boolean }>;
  getCapabilities: Awaited<ReturnType<import("@/src/features/x-client/types").XClient["getCapabilities"]>>;
};

export type FallbackResultStatus =
  | "not_available"
  | "not_attempted"
  | "unconfigured"
  | "succeeded"
  | "failed";

export interface ExecutionFallbackState {
  enabled: boolean;
  available: boolean;
  attempted: boolean;
  result: FallbackResultStatus;
  message: string;
}

export interface ExecutionMetadata {
  action: ExecutionActionType;
  mode: "demo" | "live";
  authMethod: XAuthMethod | "system";
  primaryExecutor: "api" | "fallback";
  capabilityHint: XCapability | "n/a";
  fallback: ExecutionFallbackState;
}

export type NormalizedActionResult<T> =
  | {
      ok: true;
      data: T;
      error: null;
      metadata: ExecutionMetadata;
    }
  | {
      ok: false;
      data: null;
      error: XNormalizedError;
      metadata: ExecutionMetadata;
    };

export interface ExecutionStatusPanel {
  enabled: boolean;
  available: boolean;
  provider: "fallback_interface";
  headline: string;
  detail: string;
  nextStep: string;
}

export interface ExecutionSettingsSnapshot {
  browserFallbackEnabled: boolean;
  status: ExecutionStatusPanel;
}

export interface ActionExecutor {
  kind: "api" | "fallback";
  isAvailable(): Promise<boolean>;
  execute<TAction extends ExecutionActionType>(
    action: TAction,
    payload: ExecutionPayloadMap[TAction],
  ): Promise<ExecutionResponseMap[TAction] | NormalizedActionResult<unknown>>;
}
