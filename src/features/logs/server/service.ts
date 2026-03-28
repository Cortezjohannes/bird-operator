import "server-only";

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
  return listActionLogs();
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
