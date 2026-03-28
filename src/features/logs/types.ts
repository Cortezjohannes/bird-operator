import type { XAuthMethod } from "@/src/features/x-auth/types";

export type ActionResultStatus = "success" | "failed" | "queued" | "skipped";
export type ActionActorType = "owner" | "operator" | "system";
export type ActionExecutionPath =
  | "direct"
  | "approval_gated"
  | "auto_executed"
  | "owner_only_blocked";

export type ActionTargetType =
  | "tweet"
  | "user"
  | "profile"
  | "timeline"
  | "mention"
  | "approval"
  | "draft"
  | "settings"
  | "pairing_request"
  | "operator_session"
  | "x_account"
  | "system";

export interface ActionLog {
  id: string;
  timestamp: string;
  actor: string;
  actor_type: ActionActorType;
  action_type: string;
  target_type: ActionTargetType;
  target_id: string | null;
  payload_summary: string;
  result_status: ActionResultStatus;
  result_excerpt: string;
  auth_method: XAuthMethod | "system";
  related_tweet_id: string | null;
  operator_session_id: string | null;
  operator_session_mode:
    | "approval_required"
    | "trusted_operator"
    | "custom"
    | null;
  execution_path: ActionExecutionPath | null;
  fallback_available: boolean;
  fallback_attempted: boolean;
  fallback_result: "not_available" | "not_attempted" | "unconfigured" | "succeeded" | "failed";
}

export interface ActionLogFilters {
  actionType: string;
  status: ActionResultStatus | "all";
  actor: string;
  dateFrom: string;
  dateTo: string;
}
