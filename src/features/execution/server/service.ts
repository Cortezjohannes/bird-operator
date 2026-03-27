import "server-only";

import { getConsoleRuntime } from "@/src/features/console/server/runtime";
import { recordActionLog } from "@/src/features/logs/server/service";
import {
  getExecutionSettings,
  updateExecutionSettings,
} from "@/src/features/operator-store/server/store";
import { sanitizeErrorMessage } from "@/src/features/x-auth/server/sanitize";
import { createXClient } from "@/src/features/x-client/server";
import type { XClient, XServiceResult } from "@/src/features/x-client/types";
import type {
  ExecutionActionType,
  ExecutionFallbackState,
  ExecutionPayloadMap,
  ExecutionResponseMap,
  ExecutionSettingsSnapshot,
  ExecutionStatusPanel,
  NormalizedActionResult,
} from "@/src/features/execution/types";

function getFallbackStatus(enabled: boolean): ExecutionStatusPanel {
  return {
    enabled,
    available: false,
    provider: "placeholder",
    headline: enabled
      ? "Browser fallback is armed but not installed."
      : "Browser fallback is disabled.",
    detail:
      "This repo exposes a server-only fallback interface and status plumbing, but it does not ship any browser session, cookies, or Playwright automation.",
    nextStep:
      "Attach a Playwright-backed executor later and keep credentials in local ignored storage only.",
  };
}

export async function getExecutionSettingsSnapshot(): Promise<ExecutionSettingsSnapshot> {
  const settings = await getExecutionSettings();
  return {
    browserFallbackEnabled: settings.browserFallbackEnabled,
    status: getFallbackStatus(settings.browserFallbackEnabled),
  };
}

export async function setExecutionSettings(input: {
  browserFallbackEnabled: boolean;
}): Promise<ExecutionSettingsSnapshot> {
  const settings = await updateExecutionSettings({
    browserFallbackEnabled: input.browserFallbackEnabled,
  });

  await recordActionLog({
    actor: "operator",
    actionType: "settings.execution",
    targetType: "settings",
    payloadSummary: `Browser fallback ${settings.browserFallbackEnabled ? "enabled" : "disabled"}`,
    resultStatus: "success",
    resultExcerpt: "Execution settings updated.",
    authMethod: "system",
    fallbackAvailable: false,
    fallbackAttempted: false,
    fallbackResult: settings.browserFallbackEnabled ? "placeholder" : "not_attempted",
  });

  return {
    browserFallbackEnabled: settings.browserFallbackEnabled,
    status: getFallbackStatus(settings.browserFallbackEnabled),
  };
}

function createFallbackState(input: {
  enabled: boolean;
  attempted: boolean;
  result: ExecutionFallbackState["result"];
  message: string;
}): ExecutionFallbackState {
  return {
    enabled: input.enabled,
    available: false,
    attempted: input.attempted,
    result: input.result,
    message: sanitizeErrorMessage(input.message),
  };
}

function normalizeFromXResult<T>(
  action: ExecutionActionType,
  result: XServiceResult<T>,
  fallback: ExecutionFallbackState,
): NormalizedActionResult<T> {
  if (result.ok) {
    return {
      ok: true,
      data: result.data,
      error: null,
      metadata: {
        action,
        mode: result.mode,
        authMethod: result.authStrategy,
        primaryExecutor: "api",
        capabilityHint: "n/a",
        fallback,
      },
    };
  }

  return {
    ok: false,
    data: null,
    error: result.error,
    metadata: {
      action,
      mode: result.mode,
      authMethod: result.authStrategy,
      primaryExecutor: "api",
      capabilityHint: "n/a",
      fallback,
    },
  };
}

async function executeApiAction<TAction extends ExecutionActionType>(
  client: XClient,
  action: TAction,
  payload: ExecutionPayloadMap[TAction],
): Promise<ExecutionResponseMap[TAction]> {
  switch (action) {
    case "getTimeline":
      return client.getTimeline() as Promise<ExecutionResponseMap[TAction]>;
    case "getMentions":
      return client.getMentions() as Promise<ExecutionResponseMap[TAction]>;
    case "getUser":
      return client.getUser((payload as ExecutionPayloadMap["getUser"]).handle) as Promise<ExecutionResponseMap[TAction]>;
    case "createPost": {
      const input = payload as ExecutionPayloadMap["createPost"];
      return client.createPost(input.text, input.media) as Promise<ExecutionResponseMap[TAction]>;
    }
    case "createReply": {
      const input = payload as ExecutionPayloadMap["createReply"];
      return client.createReply(input.tweetId, input.text) as Promise<ExecutionResponseMap[TAction]>;
    }
    case "createQuote": {
      const input = payload as ExecutionPayloadMap["createQuote"];
      return client.createQuote(input.tweetId, input.text) as Promise<ExecutionResponseMap[TAction]>;
    }
    case "likeTweet":
      return client.likeTweet((payload as ExecutionPayloadMap["likeTweet"]).tweetId) as Promise<ExecutionResponseMap[TAction]>;
    case "repostTweet":
      return client.repostTweet((payload as ExecutionPayloadMap["repostTweet"]).tweetId) as Promise<ExecutionResponseMap[TAction]>;
    case "bookmarkTweet":
      return client.bookmarkTweet((payload as ExecutionPayloadMap["bookmarkTweet"]).tweetId) as Promise<ExecutionResponseMap[TAction]>;
    case "followUser":
      return client.followUser((payload as ExecutionPayloadMap["followUser"]).userId) as Promise<ExecutionResponseMap[TAction]>;
    case "unfollowUser":
      return client.unfollowUser((payload as ExecutionPayloadMap["unfollowUser"]).userId) as Promise<ExecutionResponseMap[TAction]>;
    case "updateProfileText":
      return client.updateProfileText(payload as ExecutionPayloadMap["updateProfileText"]) as Promise<ExecutionResponseMap[TAction]>;
    case "updateProfileMedia":
      return client.updateProfileMedia(payload as ExecutionPayloadMap["updateProfileMedia"]) as Promise<ExecutionResponseMap[TAction]>;
    case "getCapabilities":
      return client.getCapabilities(payload as ExecutionPayloadMap["getCapabilities"]) as Promise<ExecutionResponseMap[TAction]>;
  }
}

async function executeFallbackPlaceholder<T>(
  action: ExecutionActionType,
  apiResult: XServiceResult<T>,
  enabled: boolean,
): Promise<NormalizedActionResult<T>> {
  const fallback = createFallbackState({
    enabled,
    attempted: enabled && apiResult.mode === "live" && !apiResult.ok,
    result:
      enabled && apiResult.mode === "live" && !apiResult.ok
        ? "placeholder"
        : enabled
          ? "not_attempted"
          : "not_available",
    message:
      enabled && apiResult.mode === "live" && !apiResult.ok
        ? "Browser fallback was enabled, but only a placeholder executor is installed."
        : enabled
          ? "Browser fallback is available in settings but was not needed for this action."
          : "Browser fallback is disabled.",
  });

  return normalizeFromXResult(action, apiResult, fallback);
}

export async function executeAction<TAction extends ExecutionActionType>(
  action: TAction,
  payload: ExecutionPayloadMap[TAction],
): Promise<NormalizedActionResult<
  ExecutionResponseMap[TAction] extends XServiceResult<infer T> ? T : never
>> {
  const settings = await getExecutionSettings();
  const client = createXClient();
  const apiResult = (await executeApiAction(client, action, payload)) as XServiceResult<
    ExecutionResponseMap[TAction] extends XServiceResult<infer T> ? T : never
  >;
  return executeFallbackPlaceholder(action, apiResult, settings.browserFallbackEnabled);
}

export async function logExecutionOutcome(input: {
  actor: string;
  actionType: string;
  targetType: "tweet" | "user" | "profile" | "timeline" | "mention" | "approval" | "draft" | "settings" | "system";
  targetId?: string | null;
  payloadSummary: string;
  result: NormalizedActionResult<unknown>;
  relatedTweetId?: string | null;
}) {
  const excerpt = input.result.ok
    ? `Executed via ${input.result.metadata.primaryExecutor}. ${input.result.metadata.fallback.message}`
    : input.result.error.message;

  return recordActionLog({
    actor: input.actor,
    actionType: `${input.actionType}.execution`,
    targetType: input.targetType,
    targetId: input.targetId || null,
    payloadSummary: sanitizeErrorMessage(input.payloadSummary),
    resultStatus: input.result.ok ? "success" : "failed",
    resultExcerpt: sanitizeErrorMessage(excerpt),
    authMethod:
      input.result.metadata.mode === "demo"
        ? "demo"
        : input.result.metadata.authMethod,
    relatedTweetId: input.relatedTweetId || null,
    fallbackAvailable: input.result.metadata.fallback.available,
    fallbackAttempted: input.result.metadata.fallback.attempted,
    fallbackResult: input.result.metadata.fallback.result,
  });
}

export function liveExecutionAllowed() {
  const runtime = getConsoleRuntime();
  return runtime.mode === "demo" || runtime.isLiveReady;
}
