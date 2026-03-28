import "server-only";

import { getConsoleRuntime } from "@/src/features/console/server/runtime";
import { appendActionLog, listActionLogs } from "@/src/features/operator-store/server/store";
import { sanitizeErrorMessage } from "@/src/features/x-auth/server/sanitize";
import type {
  ActionLog,
  ActionLogFilters,
  ActionResultStatus,
  ActionTargetType,
} from "@/src/features/logs/types";

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

const demoLogs: ActionLog[] = [
  {
    id: "action-demo-1",
    timestamp: "2026-03-28T02:10:00.000Z",
    actor: "operator",
    actor_type: "operator",
    action_type: "createPost",
    target_type: "tweet",
    target_id: "demo-post-001",
    payload_summary: "Posted a launch room follow-up from the demo queue.",
    result_status: "success",
    result_excerpt: "Demo post created successfully.",
    auth_method: "demo",
    related_tweet_id: "demo-post-001",
    operator_session_id: "op-session-demo",
    operator_session_mode: "trusted_operator",
    execution_path: "auto_executed",
    fallback_available: false,
    fallback_attempted: false,
    fallback_result: "not_attempted",
  },
  {
    id: "action-demo-2",
    timestamp: "2026-03-28T02:24:00.000Z",
    actor: "operator",
    actor_type: "operator",
    action_type: "approval_requested",
    target_type: "approval",
    target_id: "approval-demo-1",
    payload_summary: "Queued an operator reply for approval review.",
    result_status: "queued",
    result_excerpt: "Reply draft sent to approval lane.",
    auth_method: "system",
    related_tweet_id: "demo-mention-1",
    operator_session_id: "op-session-demo-approval",
    operator_session_mode: "approval_required",
    execution_path: "approval_gated",
    fallback_available: false,
    fallback_attempted: false,
    fallback_result: "not_attempted",
  },
  {
    id: "action-demo-3",
    timestamp: "2026-03-28T02:41:00.000Z",
    actor: "approver",
    actor_type: "owner",
    action_type: "profile_edit",
    target_type: "profile",
    target_id: "profile-demo-1",
    payload_summary: "Applied a profile surface revision after review.",
    result_status: "success",
    result_excerpt: "Profile surface updated in demo mode.",
    auth_method: "demo",
    related_tweet_id: null,
    operator_session_id: null,
    operator_session_mode: null,
    execution_path: "direct",
    fallback_available: false,
    fallback_attempted: false,
    fallback_result: "not_attempted",
  },
  {
    id: "action-demo-4",
    timestamp: "2026-03-28T02:57:00.000Z",
    actor: "operator",
    actor_type: "owner",
    action_type: "settings.execution",
    target_type: "settings",
    target_id: null,
    payload_summary: "Browser fallback enabled for future local-only automation.",
    result_status: "success",
    result_excerpt: "Fallback remains placeholder-only until a Playwright executor is installed.",
    auth_method: "system",
    related_tweet_id: null,
    operator_session_id: null,
    operator_session_mode: null,
    execution_path: "direct",
    fallback_available: false,
    fallback_attempted: false,
    fallback_result: "placeholder",
  },
];

export async function recordActionLog(input: {
  actor?: string;
  actorType?: ActionLog["actor_type"];
  actionType: string;
  targetType: ActionTargetType;
  targetId?: string | null;
  payloadSummary: string;
  resultStatus: ActionResultStatus;
  resultExcerpt: string;
  authMethod: ActionLog["auth_method"];
  relatedTweetId?: string | null;
  operatorSessionId?: string | null;
  operatorSessionMode?: ActionLog["operator_session_mode"];
  executionPath?: ActionLog["execution_path"];
  fallbackAvailable?: boolean;
  fallbackAttempted?: boolean;
  fallbackResult?: ActionLog["fallback_result"];
}) {
  const record: ActionLog = {
    id: createId("action"),
    timestamp: new Date().toISOString(),
    actor: input.actor || "system",
    actor_type: input.actorType || "system",
    action_type: input.actionType,
    target_type: input.targetType,
    target_id: input.targetId || null,
    payload_summary: sanitizeErrorMessage(input.payloadSummary),
    result_status: input.resultStatus,
    result_excerpt: sanitizeErrorMessage(input.resultExcerpt),
    auth_method: input.authMethod,
    related_tweet_id: input.relatedTweetId || null,
    operator_session_id: input.operatorSessionId || null,
    operator_session_mode: input.operatorSessionMode || null,
    execution_path: input.executionPath || null,
    fallback_available: input.fallbackAvailable || false,
    fallback_attempted: input.fallbackAttempted || false,
    fallback_result: input.fallbackResult || "not_attempted",
  };

  await appendActionLog(record);
  return record;
}

export async function getActionLogs() {
  const stored = await listActionLogs();
  const runtime = await getConsoleRuntime();
  if (runtime.mode === "demo" && stored.length === 0) {
    return demoLogs;
  }
  return stored.length > 0 ? stored : demoLogs;
}

export async function filterActionLogs(filters: ActionLogFilters) {
  const logs = await getActionLogs();
  return logs.filter((log: ActionLog) => {
    if (filters.actionType !== "all" && log.action_type !== filters.actionType) {
      return false;
    }
    if (filters.status !== "all" && log.result_status !== filters.status) {
      return false;
    }
    if (filters.actor !== "all" && log.actor !== filters.actor) {
      return false;
    }
    if (filters.dateFrom && new Date(log.timestamp) < new Date(filters.dateFrom)) {
      return false;
    }
    if (filters.dateTo && new Date(log.timestamp) > new Date(`${filters.dateTo}T23:59:59`)) {
      return false;
    }
    return true;
  });
}
