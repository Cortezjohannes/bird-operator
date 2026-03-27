import "server-only";

import { capabilityAuthPreference, capabilityOrder } from "@/src/features/x-auth/capabilities";
import { getDetectedAuthMethods } from "@/src/features/x-auth/server/auth-config";
import { sanitizeErrorMessage } from "@/src/features/x-auth/server/sanitize";
import { callXEndpoint } from "@/src/features/x-auth/server/x-api-client";
import type {
  AuthStatusPayload,
  CapabilityTestResult,
  XAuthMethod,
  XCapability,
} from "@/src/features/x-auth/types";
import { getConsoleRuntime } from "@/src/features/console/server/runtime";

interface CachedCapabilityResults {
  key: string;
  results: CapabilityTestResult[];
}

declare global {
  var __xOperatorCapabilityCache: CachedCapabilityResults | undefined;
}

function createResult(
  capability: XCapability,
  mode: "demo" | "live",
  authMethodUsed: XAuthMethod,
  supported: boolean,
  error: string | null,
): CapabilityTestResult {
  return {
    capability,
    supported,
    testedAt: new Date().toISOString(),
    mode,
    authMethodUsed,
    error: error ? sanitizeErrorMessage(error) : null,
  };
}

function extractProblemMessage(body: unknown) {
  if (!body || typeof body !== "object") {
    return null;
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

  return null;
}

function inferSupportFromProbe(status: number, body: unknown) {
  if (status >= 200 && status < 300) {
    return { supported: true, error: null };
  }

  const message = extractProblemMessage(body) || "Capability probe failed.";
  const lowered = message.toLowerCase();
  const authFailure =
    status === 401 ||
    lowered.includes("authorization") ||
    lowered.includes("authenticate") ||
    lowered.includes("auth") ||
    lowered.includes("permission") ||
    lowered.includes("scope") ||
    lowered.includes("forbidden");

  if (!authFailure && [400, 404, 409, 422].includes(status)) {
    return { supported: true, error: sanitizeErrorMessage(message) };
  }

  return { supported: false, error: sanitizeErrorMessage(message) };
}

async function resolveLiveUserId(authMethod: XAuthMethod) {
  const response = await callXEndpoint({
    authMethod,
    path: "/2/users/me",
  });

  if (!response.ok || !response.body || typeof response.body !== "object") {
    return {
      userId: null,
      error:
        response.sanitizedError || "Unable to resolve the authenticated X user.",
    };
  }

  const data = "data" in response.body ? response.body.data : null;
  if (!data || typeof data !== "object" || !("id" in data)) {
    return {
      userId: null,
      error: "Authenticated X user response did not include an id.",
    };
  }

  return {
    userId: String(data.id),
    error: null,
  };
}

async function probeCapabilityWithMethod(
  capability: XCapability,
  authMethod: XAuthMethod,
) {
  const userContextNeeded = capability !== "analytics_read";
  const userContext = userContextNeeded
    ? await resolveLiveUserId(authMethod)
    : { userId: null, error: null };

  if (userContextNeeded && !userContext.userId) {
    return createResult(
      capability,
      "live",
      authMethod,
      false,
      userContext.error || "Unable to establish authenticated user context.",
    );
  }

  const userId = userContext.userId;
  let response;

  switch (capability) {
    case "read_timeline":
      response = await callXEndpoint({
        authMethod,
        path: `/2/users/${userId}/timelines/reverse_chronological`,
        query: { max_results: "5" },
      });
      break;
    case "read_mentions":
      response = await callXEndpoint({
        authMethod,
        path: `/2/users/${userId}/mentions`,
        query: { max_results: "5" },
      });
      break;
    case "post_tweet":
      response = await callXEndpoint({
        authMethod,
        path: "/2/tweets",
        method: "POST",
        body: {},
      });
      break;
    case "reply_tweet":
      response = await callXEndpoint({
        authMethod,
        path: "/2/tweets",
        method: "POST",
        body: {
          text: "Capability probe",
          reply: { in_reply_to_tweet_id: "0" },
        },
      });
      break;
    case "quote_tweet":
      response = await callXEndpoint({
        authMethod,
        path: "/2/tweets",
        method: "POST",
        body: {
          text: "Capability probe",
          quote_tweet_id: "0",
        },
      });
      break;
    case "like_tweet":
      response = await callXEndpoint({
        authMethod,
        path: `/2/users/${userId}/likes`,
        method: "POST",
        body: { tweet_id: "0" },
      });
      break;
    case "repost_tweet":
      response = await callXEndpoint({
        authMethod,
        path: `/2/users/${userId}/retweets`,
        method: "POST",
        body: { tweet_id: "0" },
      });
      break;
    case "bookmark_tweet":
      response = await callXEndpoint({
        authMethod,
        path: `/2/users/${userId}/bookmarks`,
        method: "POST",
        body: { tweet_id: "0" },
      });
      break;
    case "follow_user":
      response = await callXEndpoint({
        authMethod,
        path: `/2/users/${userId}/following`,
        method: "POST",
        body: { target_user_id: "0" },
      });
      break;
    case "unfollow_user":
      response = await callXEndpoint({
        authMethod,
        path: `/2/users/${userId}/following/0`,
        method: "DELETE",
      });
      break;
    case "update_profile_text":
      response = await callXEndpoint({
        authMethod,
        path: "/1.1/account/update_profile.json",
        method: "POST",
        query: { name: "" },
      });
      break;
    case "update_profile_media":
      response = await callXEndpoint({
        authMethod,
        path: "/1.1/account/update_profile_image.json",
        method: "POST",
      });
      break;
    case "analytics_read":
      if (authMethod === "bearer") {
        response = await callXEndpoint({
          authMethod,
          path: "/2/users/by/username/TwitterDev",
          query: { "user.fields": "public_metrics" },
        });
      } else {
        const liveUser = await resolveLiveUserId(authMethod);
        if (!liveUser.userId) {
          return createResult(
            capability,
            "live",
            authMethod,
            false,
            liveUser.error || "Unable to resolve X user for analytics probe.",
          );
        }
        response = await callXEndpoint({
          authMethod,
          path: `/2/users/${liveUser.userId}`,
          query: { "user.fields": "public_metrics" },
        });
      }
      break;
  }

  const inferred = inferSupportFromProbe(response.status, response.body);
  return createResult(
    capability,
    "live",
    authMethod,
    inferred.supported,
    inferred.error || response.sanitizedError,
  );
}

function createDemoResults() {
  return capabilityOrder.map((capability) =>
    createResult(
      capability,
      "demo",
      "demo",
      true,
      "Demo mode uses seeded mock probes instead of live X requests.",
    ),
  );
}

function getCacheKey() {
  return JSON.stringify({
    requestedMode: process.env.X_OPERATOR_CONSOLE_MODE || "demo",
    oauth1: !!process.env.X_APP_KEY,
    oauth2: !!process.env.X_OAUTH2_ACCESS_TOKEN,
    bearer: !!process.env.X_BEARER_TOKEN,
    client: !!process.env.X_CLIENT_ID,
  });
}

export async function runCapabilityTests(options?: { force?: boolean }) {
  const runtime = getConsoleRuntime();
  const cacheKey = getCacheKey();

  if (
    !options?.force &&
    globalThis.__xOperatorCapabilityCache &&
    globalThis.__xOperatorCapabilityCache.key === cacheKey
  ) {
    return globalThis.__xOperatorCapabilityCache.results;
  }

  const results =
    runtime.mode === "demo"
      ? createDemoResults()
      : await Promise.all(
          capabilityOrder.map(async (capability) => {
            const authMethods = capabilityAuthPreference[capability].filter(
              (method) =>
                getDetectedAuthMethods().some(
                  (detected) =>
                    detected.key === method && detected.canBeUsedForLiveTests,
                ),
            );

            if (authMethods.length === 0) {
              return createResult(
                capability,
                "live",
                "none",
                false,
                "No compatible live auth method is configured for this capability.",
              );
            }

            for (const authMethod of authMethods) {
              const result = await probeCapabilityWithMethod(capability, authMethod);
              if (result.supported || authMethod === authMethods.at(-1)) {
                return result;
              }
            }

            return createResult(
              capability,
              "live",
              "none",
              false,
              "Capability probe completed without a usable auth method.",
            );
          }),
        );

  globalThis.__xOperatorCapabilityCache = {
    key: cacheKey,
    results,
  };

  return results;
}

export function getAuthStatus(): AuthStatusPayload {
  const runtime = getConsoleRuntime();
  const detectedAuthMethods = getDetectedAuthMethods();

  return {
    mode: runtime.mode,
    requestedMode: runtime.requestedMode,
    isLiveReady: runtime.isLiveReady,
    hasPartialLiveConfig: runtime.hasPartialLiveConfig,
    detectedAuthMethods,
    liveProbeSummary:
      runtime.mode === "live"
        ? "Live capability probes are active and run server-side against X endpoints."
        : "Demo mode is active. Live mode requires complete local env configuration and will never expose secrets to the client.",
  };
}
