import "server-only";

import { capabilityAuthPreference, capabilityOrder } from "@/src/features/x-auth/capabilities";
import { recordActionLog } from "@/src/features/logs/server/service";
import {
  getDetectedAuthMethods,
  getCurrentConnectedXAccountSummary,
  getScopedConnectedXAccountSummary,
} from "@/src/features/x-auth/server/connected-account";
import type {
  CapabilityTestResult,
  XAuthMethod,
  XCapability,
} from "@/src/features/x-auth/types";
import { getConsoleRuntime } from "@/src/features/console/server/runtime";
import { createLogEntry, createNormalizedError } from "@/src/features/x-client/server/errors";
import { performXRequest } from "@/src/features/x-client/server/http";
import { emitXLog } from "@/src/features/x-client/server/logger";
import type {
  XClient,
  XNormalizedError,
  XPostRecord,
  XServiceResult,
  XTimelineEntry,
  XUserSummary,
} from "@/src/features/x-client/types";

interface CachedCapabilityResults {
  key: string;
  results: CapabilityTestResult[];
}

interface XClientScope {
  appUserId?: string | null;
  expectedXUserId?: string | null;
  strictLive?: boolean;
}

declare global {
  var __xOperatorCapabilityCache: CachedCapabilityResults | undefined;
}

function formatResult<T>(
  input:
    | {
        ok: true;
        mode: "unavailable" | "live";
        authStrategy: XAuthMethod;
        operation: string;
        endpointLabel: string;
        status: number;
        data: T;
        message: string;
        actor?: string;
        targetType?: "tweet" | "user" | "profile" | "timeline" | "mention" | "system";
        targetId?: string | null;
        payloadSummary?: string;
        relatedTweetId?: string | null;
      }
    | {
        ok: false;
        mode: "unavailable" | "live";
        authStrategy: XAuthMethod;
        operation: string;
        endpointLabel: string;
        error: XNormalizedError;
        actor?: string;
        targetType?: "tweet" | "user" | "profile" | "timeline" | "mention" | "system";
        targetId?: string | null;
        payloadSummary?: string;
        relatedTweetId?: string | null;
      },
): XServiceResult<T> {
  if (input.ok) {
    const logEntry = createLogEntry({
      mode: input.mode,
      operation: input.operation,
      endpointLabel: input.endpointLabel,
      authStrategy: input.authStrategy,
      success: true,
      status: input.status,
      message: input.message,
    });
    emitXLog(logEntry);
    void recordActionLog({
      actor: input.actor || "operator",
      actionType: input.operation,
      targetType: input.targetType || "system",
      targetId: input.targetId || null,
      payloadSummary: input.payloadSummary || input.endpointLabel,
      resultStatus: "success",
      resultExcerpt: input.message,
      authMethod: input.authStrategy,
      relatedTweetId: input.relatedTweetId || null,
    });
    return {
      ok: true,
      data: input.data,
      logEntry,
      mode: input.mode,
      authStrategy: input.authStrategy,
    };
  }

  const logEntry = createLogEntry({
    mode: input.mode,
    operation: input.operation,
    endpointLabel: input.endpointLabel,
    authStrategy: input.authStrategy,
    success: false,
    status: input.error.status,
    message: input.error.message,
  });
  emitXLog(logEntry);
  void recordActionLog({
    actor: input.actor || "operator",
    actionType: input.operation,
    targetType: input.targetType || "system",
    targetId: input.targetId || null,
    payloadSummary: input.payloadSummary || input.endpointLabel,
    resultStatus: "failed",
    resultExcerpt: input.error.message,
    authMethod: input.authStrategy,
    relatedTweetId: input.relatedTweetId || null,
  });
  return {
    ok: false,
    error: input.error,
    logEntry,
    mode: input.mode,
    authStrategy: input.authStrategy,
  };
}

function extractData<T>(body: unknown, fallback: T): T {
  if (body && typeof body === "object" && "data" in body) {
    return body.data as T;
  }
  return fallback;
}

function extractUsersById(body: unknown) {
  const includes =
    body && typeof body === "object" && "includes" in body
      ? (body as { includes?: unknown }).includes
      : null;
  const users =
    includes && typeof includes === "object" && "users" in includes
      ? (includes as { users?: unknown }).users
      : null;
  const userMap = new Map<string, { handle: string; name: string }>();

  if (!Array.isArray(users)) {
    return userMap;
  }

  for (const entry of users) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const user = entry as Record<string, unknown>;
    const id = typeof user.id === "string" ? user.id : "";
    if (!id) {
      continue;
    }

    userMap.set(id, {
      handle: `@${String(user.username || "unknown")}`,
      name: String(user.name || user.username || "Unknown user"),
    });
  }

  return userMap;
}

function mapTimelineEntries(body: unknown, options: {
  unread: boolean;
  fallbackHandle: string;
  fallbackName: string;
}) {
  const tweets = extractData<Array<Record<string, unknown>>>(body, []);
  const usersById = extractUsersById(body);

  return tweets.map((tweet) => {
    const authorId = typeof tweet.author_id === "string" ? tweet.author_id : "";
    const author = usersById.get(authorId);

    return {
      id: String(tweet.id || ""),
      text: String(tweet.text || ""),
      authorHandle: author?.handle || options.fallbackHandle,
      authorName: author?.name || options.fallbackName,
      createdAt: String(tweet.created_at || new Date().toISOString()),
      metrics:
        tweet.public_metrics && typeof tweet.public_metrics === "object"
          ? {
              replies: Number(
                (tweet.public_metrics as Record<string, unknown>).reply_count || 0,
              ),
              reposts: Number(
                (tweet.public_metrics as Record<string, unknown>).retweet_count || 0,
              ),
              likes: Number(
                (tweet.public_metrics as Record<string, unknown>).like_count || 0,
              ),
              bookmarks: Number(
                (tweet.public_metrics as Record<string, unknown>).bookmark_count || 0,
              ),
              impressions: Number(
                (tweet.public_metrics as Record<string, unknown>).impression_count || 0,
              ),
            }
          : undefined,
      unread: options.unread,
    };
  });
}

function createUnavailableClient(input?: {
  mode?: "unavailable" | "live";
  reason?: string;
}): XClient {
  const mode = input?.mode || "unavailable";
  const reason =
    input?.reason ||
    "Live X access is unavailable. Connect a valid X account and confirm the required auth scopes.";

  function unavailable<T>(operation: string, endpointLabel: string): XServiceResult<T> {
    return formatResult<T>({
      ok: false,
      mode,
      authStrategy: "none",
      operation,
      endpointLabel,
      error: createNormalizedError({
        code: "live_unavailable",
        status: 503,
        endpointLabel,
        authStrategy: "none",
        message: reason,
      }),
    });
  }

  return {
    async getTimeline() {
      return unavailable("getTimeline", "Get timeline");
    },
    async getMentions() {
      return unavailable("getMentions", "Get mentions");
    },
    async getUser() {
      return unavailable("getUser", "Get user by handle");
    },
    async createPost() {
      return unavailable("createPost", "Create post");
    },
    async createReply() {
      return unavailable("createReply", "Create reply");
    },
    async createQuote() {
      return unavailable("createQuote", "Create quote post");
    },
    async likeTweet() {
      return unavailable("likeTweet", "Like tweet");
    },
    async repostTweet() {
      return unavailable("repostTweet", "Repost tweet");
    },
    async bookmarkTweet() {
      return unavailable("bookmarkTweet", "Bookmark tweet");
    },
    async followUser() {
      return unavailable("followUser", "Follow user");
    },
    async unfollowUser() {
      return unavailable("unfollowUser", "Unfollow user");
    },
    async updateProfileText() {
      return unavailable("updateProfileText", "Update profile text");
    },
    async updateProfileMedia() {
      return unavailable("updateProfileMedia", "Update profile media");
    },
    async getCapabilities() {
      return unavailable("getCapabilities", "Capability matrix");
    },
  };
}

async function getConfiguredLiveStrategies(scope?: XClientScope) {
  return (await getDetectedAuthMethods(scope))
    .filter((method) => method.canBeUsedForLiveTests)
    .map((method) => method.key);
}

async function chooseAuthStrategy(
  capability: XCapability,
  preferred?: XAuthMethod,
  scope?: XClientScope,
): Promise<XAuthMethod> {
  const available = new Set(await getConfiguredLiveStrategies(scope));

  if (preferred && available.has(preferred)) {
    return preferred;
  }

  for (const authMethod of capabilityAuthPreference[capability]) {
    if (available.has(authMethod)) {
      return authMethod;
    }
  }

  return "none";
}

async function resolveAuthenticatedUserId(
  authStrategy: XAuthMethod,
  authContext?: XClientScope,
) {
  const result = await performXRequest({
    authStrategy,
    endpointLabel: "Resolve authenticated user",
    path: "/2/users/me",
    authContext,
  });

  if (!result.ok) {
    return result;
  }

  const data = extractData<{ id: string } | null>(result.body, null);
  if (!data?.id) {
    return {
      ok: false as const,
      error: createNormalizedError({
        code: "invalid_response",
        status: result.status,
        endpointLabel: "Resolve authenticated user",
        authStrategy,
        message: "Authenticated user response did not include an id.",
      }),
    };
  }

  return {
    ok: true as const,
    status: result.status,
    userId: data.id,
  };
}

async function executeLiveRequest<T>(input: {
  capability: XCapability;
  operation: string;
  endpointLabel: string;
  method?: "GET" | "POST" | "DELETE";
  pathResolver: (context: { userId: string | null }) => string;
  body?: unknown;
  query?: Record<string, string>;
  mapData: (body: unknown) => T;
  requireUserContext?: boolean;
  preferredAuthStrategy?: XAuthMethod;
  targetType?: "tweet" | "user" | "profile" | "timeline" | "mention" | "system";
  targetId?: string | null;
  payloadSummary?: string;
  relatedTweetId?: string | null;
  authContext?: XClientScope;
}) {
  const authStrategy = await chooseAuthStrategy(
    input.capability,
    input.preferredAuthStrategy,
    input.authContext,
  );

  if (authStrategy === "none") {
    return formatResult<T>({
      ok: false,
      mode: "live",
      authStrategy,
      operation: input.operation,
      endpointLabel: input.endpointLabel,
      error: createNormalizedError({
        code: "auth_unavailable",
        status: 0,
        endpointLabel: input.endpointLabel,
        authStrategy,
        message: "No compatible live auth strategy is configured.",
      }),
      targetType: input.targetType,
      targetId: input.targetId,
      payloadSummary: input.payloadSummary,
      relatedTweetId: input.relatedTweetId,
    });
  }

  const context = { userId: null as string | null };
  if (input.requireUserContext !== false) {
    const me = await resolveAuthenticatedUserId(authStrategy, input.authContext);
    if (!me.ok) {
      return formatResult<T>({
        ok: false,
        mode: "live",
        authStrategy,
        operation: input.operation,
        endpointLabel: input.endpointLabel,
        error: me.error,
        targetType: input.targetType,
        targetId: input.targetId,
        payloadSummary: input.payloadSummary,
        relatedTweetId: input.relatedTweetId,
      });
    }
    context.userId = me.userId;
  }

  const response = await performXRequest({
    authStrategy,
    endpointLabel: input.endpointLabel,
    path: input.pathResolver(context),
    method: input.method,
    query: input.query,
    body: input.body,
    authContext: input.authContext,
  });

  if (!response.ok) {
    return formatResult<T>({
      ok: false,
      mode: "live",
      authStrategy,
      operation: input.operation,
      endpointLabel: input.endpointLabel,
      error: response.error,
      targetType: input.targetType,
      targetId: input.targetId,
      payloadSummary: input.payloadSummary,
      relatedTweetId: input.relatedTweetId,
    });
  }

  return formatResult<T>({
    ok: true,
    mode: "live",
    authStrategy,
    operation: input.operation,
    endpointLabel: input.endpointLabel,
    status: response.status,
    data: input.mapData(response.body),
    message: `${input.operation} completed successfully.`,
    targetType: input.targetType,
    targetId: input.targetId,
    payloadSummary: input.payloadSummary,
    relatedTweetId: input.relatedTweetId,
  });
}

function createLiveClient(scope?: XClientScope): XClient {
  const executeScopedLiveRequest = <T>(input: Parameters<typeof executeLiveRequest<T>>[0]) => {
    return executeLiveRequest<T>({
      ...input,
      authContext: scope,
    });
  };

  return {
    async getTimeline() {
      return executeScopedLiveRequest<XTimelineEntry[]>({
        capability: "read_timeline",
        operation: "getTimeline",
        endpointLabel: "Get timeline",
        targetType: "timeline",
        pathResolver: ({ userId }) =>
          `/2/users/${userId}/timelines/reverse_chronological`,
        query: {
          max_results: "10",
          expansions: "author_id",
          "tweet.fields": "author_id,created_at,public_metrics",
          "user.fields": "name,username",
        },
        mapData: (body) =>
          mapTimelineEntries(body, {
            unread: false,
            fallbackHandle: "@authenticated_user",
            fallbackName: "Authenticated User",
          }),
      });
    },
    async getMentions() {
      return executeScopedLiveRequest<XTimelineEntry[]>({
        capability: "read_mentions",
        operation: "getMentions",
        endpointLabel: "Get mentions",
        targetType: "mention",
        pathResolver: ({ userId }) => `/2/users/${userId}/mentions`,
        query: {
          max_results: "10",
          expansions: "author_id",
          "tweet.fields": "author_id,created_at,public_metrics",
          "user.fields": "name,username",
        },
        mapData: (body) =>
          mapTimelineEntries(body, {
            unread: true,
            fallbackHandle: "@unknown",
            fallbackName: "Mention Author",
          }),
      });
    },
    async getUser(handle) {
      return executeScopedLiveRequest<XUserSummary>({
        capability: "read_user",
        operation: "getUser",
        endpointLabel: "Get user by handle",
        targetType: "user",
        targetId: handle.replace(/^@/, ""),
        payloadSummary: `Lookup user ${handle}`,
        pathResolver: () => `/2/users/by/username/${handle.replace(/^@/, "")}`,
        query: { "user.fields": "description,public_metrics" },
        requireUserContext: false,
        mapData: (body) => {
          const user = extractData<Record<string, unknown>>(body, {});
          const metrics =
            user.public_metrics && typeof user.public_metrics === "object"
              ? (user.public_metrics as Record<string, unknown>)
              : undefined;
          return {
            id: String(user.id || ""),
            handle: `@${String(user.username || handle.replace(/^@/, ""))}`,
            name: String(user.name || handle.replace(/^@/, "")),
            description:
              typeof user.description === "string" ? user.description : undefined,
            metrics,
          };
        },
      });
    },
    async createPost(text, media) {
      return executeScopedLiveRequest<XPostRecord>({
        capability: "post_tweet",
        operation: "createPost",
        endpointLabel: "Create post",
        targetType: "tweet",
        payloadSummary: text.slice(0, 120),
        pathResolver: () => "/2/tweets",
        method: "POST",
        body: {
          text,
          ...(media?.length ? { media: { media_ids: media } } : {}),
        },
        mapData: (body) => {
          const tweet = extractData<Record<string, unknown>>(body, {});
          return {
            id: String(tweet.id || ""),
            text: String(tweet.text || text),
            createdAt: new Date().toISOString(),
          };
        },
      });
    },
    async createReply(tweetId, text) {
      return executeScopedLiveRequest<XPostRecord>({
        capability: "reply_tweet",
        operation: "createReply",
        endpointLabel: "Create reply",
        targetType: "tweet",
        targetId: tweetId,
        relatedTweetId: tweetId,
        payloadSummary: text.slice(0, 120),
        pathResolver: () => "/2/tweets",
        method: "POST",
        body: { text, reply: { in_reply_to_tweet_id: tweetId } },
        mapData: (body) => {
          const tweet = extractData<Record<string, unknown>>(body, {});
          return {
            id: String(tweet.id || ""),
            text: String(tweet.text || text),
            createdAt: new Date().toISOString(),
          };
        },
      });
    },
    async createQuote(tweetId, text) {
      return executeScopedLiveRequest<XPostRecord>({
        capability: "quote_tweet",
        operation: "createQuote",
        endpointLabel: "Create quote post",
        targetType: "tweet",
        targetId: tweetId,
        relatedTweetId: tweetId,
        payloadSummary: text.slice(0, 120),
        pathResolver: () => "/2/tweets",
        method: "POST",
        body: { text, quote_tweet_id: tweetId },
        mapData: (body) => {
          const tweet = extractData<Record<string, unknown>>(body, {});
          return {
            id: String(tweet.id || ""),
            text: String(tweet.text || text),
            createdAt: new Date().toISOString(),
          };
        },
      });
    },
    async likeTweet(tweetId) {
      return executeScopedLiveRequest({
        capability: "like_tweet",
        operation: "likeTweet",
        endpointLabel: "Like tweet",
        targetType: "tweet",
        targetId: tweetId,
        relatedTweetId: tweetId,
        payloadSummary: `Like tweet ${tweetId}`,
        pathResolver: ({ userId }) => `/2/users/${userId}/likes`,
        method: "POST",
        body: { tweet_id: tweetId },
        mapData: () => ({ liked: true, tweetId }),
      });
    },
    async repostTweet(tweetId) {
      return executeScopedLiveRequest({
        capability: "repost_tweet",
        operation: "repostTweet",
        endpointLabel: "Repost tweet",
        targetType: "tweet",
        targetId: tweetId,
        relatedTweetId: tweetId,
        payloadSummary: `Repost tweet ${tweetId}`,
        pathResolver: ({ userId }) => `/2/users/${userId}/retweets`,
        method: "POST",
        body: { tweet_id: tweetId },
        mapData: () => ({ reposted: true, tweetId }),
      });
    },
    async bookmarkTweet(tweetId) {
      return executeScopedLiveRequest({
        capability: "bookmark_tweet",
        operation: "bookmarkTweet",
        endpointLabel: "Bookmark tweet",
        targetType: "tweet",
        targetId: tweetId,
        relatedTweetId: tweetId,
        payloadSummary: `Bookmark tweet ${tweetId}`,
        pathResolver: ({ userId }) => `/2/users/${userId}/bookmarks`,
        method: "POST",
        body: { tweet_id: tweetId },
        mapData: () => ({ bookmarked: true, tweetId }),
      });
    },
    async followUser(userId) {
      return executeScopedLiveRequest({
        capability: "follow_user",
        operation: "followUser",
        endpointLabel: "Follow user",
        targetType: "user",
        targetId: userId,
        payloadSummary: `Follow user ${userId}`,
        pathResolver: ({ userId: sourceUserId }) =>
          `/2/users/${sourceUserId}/following`,
        method: "POST",
        body: { target_user_id: userId },
        mapData: () => ({ following: true, userId }),
      });
    },
    async unfollowUser(userId) {
      return executeScopedLiveRequest({
        capability: "unfollow_user",
        operation: "unfollowUser",
        endpointLabel: "Unfollow user",
        targetType: "user",
        targetId: userId,
        payloadSummary: `Unfollow user ${userId}`,
        pathResolver: ({ userId: sourceUserId }) =>
          `/2/users/${sourceUserId}/following/${userId}`,
        method: "DELETE",
        mapData: () => ({ following: false, userId }),
      });
    },
    async updateProfileText(input) {
      return executeScopedLiveRequest({
        capability: "update_profile_text",
        operation: "updateProfileText",
        endpointLabel: "Update profile text",
        targetType: "profile",
        targetId: "profile-surface",
        payloadSummary: "Update profile text",
        pathResolver: () => "/1.1/account/update_profile.json",
        method: "POST",
        query: Object.fromEntries(
          Object.entries({
            name: input.name,
            url: input.url,
            location: input.location,
            description: input.description,
          }).filter(([, value]) => typeof value === "string"),
        ) as Record<string, string>,
        preferredAuthStrategy: "oauth1",
        mapData: () => ({ updated: true }),
      });
    },
    async updateProfileMedia(input) {
      const authStrategy = await chooseAuthStrategy(
        "update_profile_media",
        "oauth1",
        scope,
      );
      const hasMedia = Boolean(input.avatarMediaId || input.bannerMediaId);
      if (!hasMedia) {
        return formatResult<{ updated: boolean }>({
          ok: false,
          mode: "live",
          authStrategy,
          operation: "updateProfileMedia",
          endpointLabel: "Update profile media",
          error: createNormalizedError({
            code: "invalid_input",
            status: 400,
            endpointLabel: "Update profile media",
            authStrategy,
            message: "Provide avatarMediaId or bannerMediaId for profile media updates.",
          }),
          targetType: "profile",
          targetId: "profile-surface",
          payloadSummary: "Update profile media",
        });
      }

      if (input.avatarMediaId) {
        return executeScopedLiveRequest({
          capability: "update_profile_media",
          operation: "updateProfileMedia",
          endpointLabel: "Update profile image",
          targetType: "profile",
          targetId: "profile-surface",
          payloadSummary: "Update profile avatar",
          pathResolver: () => "/1.1/account/update_profile_image.json",
          method: "POST",
          query: { media_id: input.avatarMediaId },
          preferredAuthStrategy: "oauth1",
          mapData: () => ({ updated: true }),
        });
      }

      return executeScopedLiveRequest({
        capability: "update_profile_media",
        operation: "updateProfileMedia",
        endpointLabel: "Update profile banner",
        targetType: "profile",
        targetId: "profile-surface",
        payloadSummary: "Update profile banner",
        pathResolver: () => "/1.1/account/update_profile_banner.json",
        method: "POST",
        query: { media_id: input.bannerMediaId || "" },
        preferredAuthStrategy: "oauth1",
        mapData: () => ({ updated: true }),
      });
    },
    async getCapabilities(options) {
      return formatResult<CapabilityTestResult[]>({
        ok: true,
        mode: "live",
        authStrategy: "none",
        operation: "getCapabilities",
        endpointLabel: "Capability matrix",
        status: 200,
        data: await runCapabilityTests({ ...options, scope }),
        message: "Returned live capability results.",
      });
    },
  };
}

function createCapabilityResult(
  capability: XCapability,
  result: XServiceResult<unknown>,
): CapabilityTestResult {
  const normalizedMessage = result.ok ? "" : result.error.message.toLowerCase();
  const capabilitySpecificSupportSignal =
    !result.ok &&
    ((capability === "post_tweet" &&
      normalizedMessage.includes("duplicate content")) ||
      (capability === "reply_tweet" &&
        normalizedMessage.includes("reply to this conversation is not allowed")) ||
      (capability === "quote_tweet" &&
        normalizedMessage.includes("quoting this post is not allowed")));

  const treatedAsSupported =
    capabilitySpecificSupportSignal ||
    (!result.ok &&
      [400, 404, 409, 422].includes(result.error.status) &&
      !["auth_failed", "forbidden", "auth_unavailable", "auth_not_configured"].includes(
        result.error.code,
      ));

  return {
    capability,
    supported: result.ok || treatedAsSupported,
    testedAt: new Date().toISOString(),
    mode: result.mode,
    authMethodUsed: result.authStrategy,
    error: result.ok ? null : result.error.message,
  };
}

async function getCacheKey(scope?: XClientScope) {
  const detected = await getDetectedAuthMethods(scope);
  const account = scope
    ? await getScopedConnectedXAccountSummary(scope)
    : await getCurrentConnectedXAccountSummary();
  return JSON.stringify({
    requestedMode: process.env.X_OPERATOR_CONSOLE_MODE || "unavailable",
    appUserId: scope?.appUserId || null,
    expectedXUserId: scope?.expectedXUserId || null,
    methods: detected.map((method) => ({
      key: method.key,
      configured: method.configured,
      detectedFields: method.detectedFields,
    })),
    accountId: account?.xUserId || null,
    scopes: account?.tokenStatus.scopes || [],
    expiresAt: account?.tokenStatus.expiresAt || null,
  });
}

export async function runCapabilityTests(options?: {
  force?: boolean;
  scope?: XClientScope;
}) {
  const cacheKey = await getCacheKey(options?.scope);

  if (
    !options?.force &&
    globalThis.__xOperatorCapabilityCache &&
    globalThis.__xOperatorCapabilityCache.key === cacheKey
  ) {
    return globalThis.__xOperatorCapabilityCache.results;
  }

  const client = await createXClient(options?.scope);
  const results = await Promise.all(
    capabilityOrder.map(async (capability) => {
      switch (capability) {
        case "read_user":
          return createCapabilityResult(
            capability,
            await client.getUser("TwitterDev"),
          );
        case "read_timeline":
          return createCapabilityResult(capability, await client.getTimeline());
        case "read_mentions":
          return createCapabilityResult(capability, await client.getMentions());
        case "post_tweet":
          return createCapabilityResult(
            capability,
            await client.createPost("Capability probe"),
          );
        case "reply_tweet":
          return createCapabilityResult(
            capability,
            await client.createReply("0", "Capability probe"),
          );
        case "quote_tweet":
          return createCapabilityResult(
            capability,
            await client.createQuote("0", "Capability probe"),
          );
        case "like_tweet":
          return createCapabilityResult(capability, await client.likeTweet("0"));
        case "repost_tweet":
          return createCapabilityResult(capability, await client.repostTweet("0"));
        case "bookmark_tweet":
          return createCapabilityResult(
            capability,
            await client.bookmarkTweet("0"),
          );
        case "follow_user":
          return createCapabilityResult(
            capability,
            await client.followUser("0"),
          );
        case "unfollow_user":
          return createCapabilityResult(
            capability,
            await client.unfollowUser("0"),
          );
        case "update_profile_text":
          return createCapabilityResult(
            capability,
            await client.updateProfileText({ name: "" }),
          );
        case "update_profile_media":
          return createCapabilityResult(
            capability,
            await client.updateProfileMedia({ avatarMediaId: "0" }),
          );
        case "analytics_read":
          return createCapabilityResult(
            capability,
            await client.getUser("TwitterDev"),
          );
      }
    }),
  );

  globalThis.__xOperatorCapabilityCache = { key: cacheKey, results };

  return results;
}

export async function createXClient(scope?: XClientScope): Promise<XClient> {
  const runtime = await getConsoleRuntime(scope);
  const shouldUseLiveClient =
    runtime.mode === "live" ||
    Boolean(scope?.strictLive && runtime.requestedMode === "live");
  return shouldUseLiveClient
    ? createLiveClient(scope)
    : createUnavailableClient({
        mode: runtime.mode,
        reason:
          runtime.requestedMode === "live"
            ? "Live X access is currently unavailable for this account. Reconnect X and retest capabilities."
            : "Live mode is disabled. Set X_OPERATOR_CONSOLE_MODE=live and connect an X account before using account actions.",
      });
}
