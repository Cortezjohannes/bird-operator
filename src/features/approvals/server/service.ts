import "server-only";

import { recordActionLog } from "@/src/features/logs/server/service";
import {
  getApprovalById,
  getDraftById,
  listApprovals,
  listExecutionLogs,
  updateApprovalPolicy,
  upsertApproval,
  upsertExecutionLog,
} from "@/src/features/operator-store/server/store";
import { applyProfileRevision } from "@/src/features/profile/server/service";
import { sanitizeApprovalValue } from "@/src/features/approvals/server/sanitize";
import {
  defaultApprovalPolicy,
  requiresApproval,
} from "@/src/features/approvals/server/policy";
import { postDraftNow, updateDraft } from "@/src/features/drafts/server/service";
import type {
  ApprovalActionType,
  ApprovalPolicySettings,
  ApprovalPreviewPayload,
  ApprovalPriority,
  ApprovalRequest,
  ApprovalStatus,
  DraftApprovalContext,
  ExecutionLogRecord,
} from "@/src/features/approvals/types";

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function now() {
  return new Date().toISOString();
}

async function appendExecutionLog(input: Omit<ExecutionLogRecord, "id" | "timestamp">) {
  const record: ExecutionLogRecord = {
    id: createId("exec"),
    timestamp: now(),
    ...input,
  };

  await upsertExecutionLog(record);
  return record;
}

export async function getApprovalPolicy() {
  const policy = await updateApprovalPolicy();
  return policy || defaultApprovalPolicy();
}

export async function setApprovalPolicy(settings: ApprovalPolicySettings) {
  const next = await updateApprovalPolicy(settings);
  await appendExecutionLog({
    event_type: "settings_updated",
    action_type: "settings",
    actor: "operator",
    target_id: null,
    message: `Approval preset set to ${settings.preset}.`,
    metadata: sanitizeApprovalValue(settings) as Record<string, unknown>,
  });
  await recordActionLog({
    actor: "operator",
    actionType: "settings_updated",
    targetType: "settings",
    payloadSummary: `Approval preset ${settings.preset}`,
    resultStatus: "success",
    resultExcerpt: `Updated approval policy to ${settings.preset}.`,
    authMethod: "system",
  });
  return next;
}

export async function shouldGateAction(actionType: ApprovalActionType) {
  const policy = await getApprovalPolicy();
  return requiresApproval(actionType, policy);
}

export async function createApprovalRequest(input: {
  actionType: ApprovalActionType;
  payload: Record<string, unknown>;
  reason: string;
  priority: ApprovalPriority;
  requestedBy: string;
}) {
  const request: ApprovalRequest = {
    id: createId("approval"),
    action_type: input.actionType,
    payload_json: sanitizeApprovalValue(input.payload) as Record<string, unknown>,
    reason: input.reason,
    priority: input.priority,
    status: "pending",
    requested_by: input.requestedBy,
    reviewed_by: null,
    reviewed_at: null,
    created_at: now(),
  };

  await upsertApproval(request);
  await appendExecutionLog({
    event_type: "approval_requested",
    action_type: input.actionType,
    actor: input.requestedBy,
    target_id: request.id,
    message: `${input.actionType} is waiting for approval.`,
    metadata: request.payload_json,
  });
  await recordActionLog({
    actor: input.requestedBy,
    actionType: "approval_requested",
    targetType: "approval",
    targetId: request.id,
    payloadSummary: input.reason,
    resultStatus: "queued",
    resultExcerpt: `${input.actionType} is waiting for approval.`,
    authMethod: "system",
  });
  return request;
}

export async function getApprovals(status?: ApprovalStatus) {
  const approvals = await listApprovals();
  if (!status) {
    return approvals;
  }
  return approvals.filter((approval) => approval.status === status);
}

export async function getApprovalPreview(id: string): Promise<ApprovalPreviewPayload | null> {
  const approval = await getApprovalById(id);
  if (!approval) {
    return null;
  }

  const draftId =
    typeof approval.payload_json.draftId === "string"
      ? approval.payload_json.draftId
      : null;

  const draft = draftId ? await getDraftById(draftId) : null;

  return {
    id: approval.id,
    actionType: approval.action_type,
    draft,
  };
}

async function updateApprovalStatus(
  approval: ApprovalRequest,
  nextStatus: ApprovalStatus,
  reviewer: string,
) {
  const updated: ApprovalRequest = {
    ...approval,
    status: nextStatus,
    reviewed_by: reviewer,
    reviewed_at: now(),
  };
  await upsertApproval(updated);
  return updated;
}

export async function rejectApprovalRequest(id: string, reviewer = "operator") {
  const approval = await getApprovalById(id);
  if (!approval) {
    return null;
  }

  const updated = await updateApprovalStatus(approval, "rejected", reviewer);

  const draftId =
    typeof approval.payload_json.draftId === "string"
      ? approval.payload_json.draftId
      : null;
  if (draftId) {
    await updateDraft(draftId, { status: "draft" });
  }

  await appendExecutionLog({
    event_type: "approval_rejected",
    action_type: approval.action_type,
    actor: reviewer,
    target_id: approval.id,
    message: `${approval.action_type} was rejected.`,
    metadata: approval.payload_json,
  });
  await recordActionLog({
    actor: reviewer,
    actionType: "approval_rejected",
    targetType: "approval",
    targetId: approval.id,
    payloadSummary: approval.reason,
    resultStatus: "skipped",
    resultExcerpt: `${approval.action_type} was rejected.`,
    authMethod: "system",
  });

  return updated;
}

function coerceThreadBlocksFromEdit(text: string) {
  return text
    .split("\n\n---\n\n")
    .map((blockText) => blockText.trim())
    .filter(Boolean)
    .map((blockText, index) => ({
      id: `edited-${index + 1}`,
      text: blockText,
    }));
}

export async function approveApprovalRequest(input: {
  id: string;
  reviewer?: string;
  editedText?: string;
}) {
  const reviewer = input.reviewer || "operator";
  const approval = await getApprovalById(input.id);
  if (!approval) {
    return {
      ok: false as const,
      error: { message: "Approval request not found.", status: 404, code: "not_found" },
    };
  }

  const draftId =
    typeof approval.payload_json.draftId === "string"
      ? approval.payload_json.draftId
      : null;
  const profileRevisionId =
    typeof approval.payload_json.profileRevisionId === "string"
      ? approval.payload_json.profileRevisionId
      : null;

  if (!draftId && !profileRevisionId) {
    const updated = await updateApprovalStatus(approval, "approved", reviewer);
    await appendExecutionLog({
      event_type: "approval_approved",
      action_type: approval.action_type,
      actor: reviewer,
      target_id: approval.id,
      message: `${approval.action_type} approved without linked draft.`,
      metadata: approval.payload_json,
    });
    await recordActionLog({
      actor: reviewer,
      actionType: "approval_approved",
      targetType: "approval",
      targetId: approval.id,
      payloadSummary: approval.reason,
      resultStatus: "success",
      resultExcerpt: `${approval.action_type} approved.`,
      authMethod: "system",
    });
    return { ok: true as const, approval: updated, draft: null };
  }

  if (profileRevisionId) {
    const approved = await updateApprovalStatus(approval, "approved", reviewer);
    await appendExecutionLog({
      event_type: "approval_approved",
      action_type: approval.action_type,
      actor: reviewer,
      target_id: approval.id,
      message: `${approval.action_type} approved and queued for execution.`,
      metadata: approval.payload_json,
    });
    await recordActionLog({
      actor: reviewer,
      actionType: "approval_approved",
      targetType: "approval",
      targetId: approval.id,
      payloadSummary: approval.reason,
      resultStatus: "success",
      resultExcerpt: `${approval.action_type} approved.`,
      authMethod: "system",
    });

    const execution = await applyProfileRevision(profileRevisionId, {
      bypassApproval: true,
    });

    if (!execution.ok) {
      return {
        ok: false as const,
        error: execution.error,
      };
    }

    return { ok: true as const, approval: approved, draft: null };
  }

  if (!draftId) {
    return {
      ok: false as const,
      error: { message: "Linked execution target not found.", status: 404, code: "missing_target" },
    };
  }

  const draft = await getDraftById(draftId);
  if (!draft) {
    return {
      ok: false as const,
      error: { message: "Linked draft not found.", status: 404, code: "draft_not_found" },
    };
  }

  if (typeof input.editedText === "string" && input.editedText.trim().length > 0) {
    await updateDraft(draft.id, {
      text: draft.type === "thread" ? draft.text : input.editedText,
      metadata:
        draft.type === "thread"
          ? { ...draft.metadata, threadBlocks: coerceThreadBlocksFromEdit(input.editedText) }
          : draft.metadata,
    });
  }

  const approved = await updateApprovalStatus(approval, "approved", reviewer);
  await appendExecutionLog({
    event_type: "approval_approved",
    action_type: approval.action_type,
    actor: reviewer,
    target_id: approval.id,
    message: `${approval.action_type} approved and queued for execution.`,
    metadata: approval.payload_json,
  });
  await recordActionLog({
    actor: reviewer,
    actionType: "approval_approved",
    targetType: "approval",
    targetId: approval.id,
    payloadSummary: approval.reason,
    resultStatus: "success",
    resultExcerpt: `${approval.action_type} approved.`,
    authMethod: "system",
  });

  await appendExecutionLog({
    event_type: "execution_started",
    action_type: approval.action_type,
    actor: reviewer,
    target_id: draft.id,
    message: `Executing approved ${approval.action_type}.`,
    metadata: { draftId: draft.id },
  });

  const execution = await postDraftNow(draft.id, { bypassApproval: true });

  if (!execution.ok) {
    await appendExecutionLog({
      event_type: "execution_failed",
      action_type: approval.action_type,
      actor: reviewer,
      target_id: draft.id,
      message: execution.error.message,
      metadata: sanitizeApprovalValue(execution.error) as Record<string, unknown>,
    });
    return {
      ok: false as const,
      error: execution.error,
    };
  }

  await appendExecutionLog({
    event_type: "execution_succeeded",
    action_type: approval.action_type,
    actor: reviewer,
    target_id: draft.id,
    message: `${approval.action_type} executed successfully.`,
    metadata: { draftId: draft.id, status: execution.draft?.status || "posted" },
  });

  return { ok: true as const, approval: approved, draft: execution.draft };
}

export function deriveDraftApprovalContext(draft: {
  id: string;
  type: string;
  text: string;
  target_tweet_id: string | null;
  target_user_id: string | null;
  metadata: { threadBlocks?: Array<{ id: string; text: string }> };
}): DraftApprovalContext {
  const actionTypeMap: Record<string, ApprovalActionType> = {
    post: "post_tweet",
    reply: "reply_tweet",
    quote: "quote_tweet",
    thread: "thread_post",
  };

  return {
    actionType: actionTypeMap[draft.type] || "post_tweet",
    reason: `Sensitive ${draft.type} action requires operator approval.`,
    priority:
      draft.type === "thread" || draft.type === "quote" ? "high" : "medium",
    payload: {
      draftId: draft.id,
      type: draft.type,
      text: draft.text,
      targetTweetId: draft.target_tweet_id,
      targetUserId: draft.target_user_id,
      threadBlocks: draft.metadata.threadBlocks || [],
    },
  };
}

export async function getExecutionLogs() {
  return listExecutionLogs();
}
