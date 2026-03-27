import type { DraftRecord } from "@/src/features/drafts/types";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "expired";

export type ApprovalPriority = "low" | "medium" | "high";

export type ApprovalActionType =
  | "post_tweet"
  | "reply_tweet"
  | "quote_tweet"
  | "thread_post"
  | "follow_user"
  | "profile_edit"
  | "delete_tweet";

export type ApprovalPreset = "manual" | "semi_auto" | "operator_mode";

export interface ApprovalRequest {
  id: string;
  action_type: ApprovalActionType;
  payload_json: Record<string, unknown>;
  reason: string;
  priority: ApprovalPriority;
  status: ApprovalStatus;
  requested_by: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface ApprovalPolicySettings {
  preset: ApprovalPreset;
  actionOverrides: Partial<Record<ApprovalActionType, boolean>>;
}

export interface ExecutionLogRecord {
  id: string;
  timestamp: string;
  event_type:
    | "approval_requested"
    | "approval_approved"
    | "approval_rejected"
    | "approval_expired"
    | "execution_started"
    | "execution_succeeded"
    | "execution_failed"
    | "settings_updated";
  action_type: ApprovalActionType | "settings";
  actor: string;
  target_id: string | null;
  message: string;
  metadata: Record<string, unknown>;
}

export interface DraftApprovalContext {
  actionType: ApprovalActionType;
  reason: string;
  priority: ApprovalPriority;
  payload: Record<string, unknown>;
}

export interface ApprovalPreviewPayload {
  id: string;
  actionType: ApprovalActionType;
  draft: DraftRecord | null;
}
