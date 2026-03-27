import "server-only";

import {
  createApprovalRequest,
  deriveDraftApprovalContext,
  shouldGateAction,
} from "@/src/features/approvals/server/service";
import { getConsoleRuntime } from "@/src/features/console/server/runtime";
import {
  deleteDraftById,
  getDraftById,
  listDrafts,
  upsertDraft,
} from "@/src/features/operator-store/server/store";
import { createXClient } from "@/src/features/x-client/server";
import type { DraftPayload, DraftRecord, DraftStatus } from "@/src/features/drafts/types";
import type { XPostRecord, XServiceResult } from "@/src/features/x-client/types";

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeThreadBlocks(record: DraftPayload) {
  return record.metadata?.threadBlocks?.filter((block) => block.text.trim().length > 0) || [];
}

export async function getDrafts() {
  return listDrafts();
}

export async function createDraft(input: DraftPayload) {
  const now = new Date().toISOString();
  const draft: DraftRecord = {
    id: createId("draft"),
    type: input.type,
    text: input.text,
    target_tweet_id: input.target_tweet_id || null,
    target_user_id: input.target_user_id || null,
    status: input.status || "draft",
    created_at: now,
    updated_at: now,
    scheduled_for: input.scheduled_for || null,
    metadata: {
      threadBlocks: normalizeThreadBlocks(input),
      lastError: null,
      postedTweetIds: [],
    },
  };

  await upsertDraft(draft);
  return draft;
}

export async function updateDraft(id: string, input: Partial<DraftPayload>) {
  const existing = await getDraftById(id);
  if (!existing) {
    return null;
  }

  const updated: DraftRecord = {
    ...existing,
    type: input.type || existing.type,
    text: input.text ?? existing.text,
    target_tweet_id:
      input.target_tweet_id !== undefined
        ? input.target_tweet_id
        : existing.target_tweet_id,
    target_user_id:
      input.target_user_id !== undefined
        ? input.target_user_id
        : existing.target_user_id,
    status: input.status || existing.status,
    scheduled_for:
      input.scheduled_for !== undefined
        ? input.scheduled_for
        : existing.scheduled_for,
    updated_at: new Date().toISOString(),
    metadata: {
      ...existing.metadata,
      ...(input.metadata || {}),
      threadBlocks:
        input.metadata?.threadBlocks !== undefined
          ? normalizeThreadBlocks({
              type: existing.type,
              text: existing.text,
              metadata: input.metadata,
            })
          : existing.metadata.threadBlocks,
    },
  };

  await upsertDraft(updated);
  return updated;
}

export async function deleteDraft(id: string) {
  return deleteDraftById(id);
}

export async function submitDraftForApproval(id: string) {
  const draft = await getDraftById(id);
  if (!draft) {
    return null;
  }

  const approvalContext = deriveDraftApprovalContext(draft);
  await createApprovalRequest({
    actionType: approvalContext.actionType,
    payload: approvalContext.payload,
    reason: approvalContext.reason,
    priority: approvalContext.priority,
    requestedBy: "operator",
  });

  return updateDraft(id, { status: "pending_approval" });
}

async function markDraftState(
  draft: DraftRecord,
  status: DraftStatus,
  error?: { message: string; status: number; code: string } | null,
  postedTweetIds?: string[],
) {
  return updateDraft(draft.id, {
    status,
    metadata: {
      ...draft.metadata,
      lastError: error || null,
      postedTweetIds: postedTweetIds || draft.metadata.postedTweetIds,
    },
  });
}

function postNowAllowed() {
  const runtime = getConsoleRuntime();
  return runtime.mode === "demo" || runtime.isLiveReady;
}

export async function postDraftNow(
  id: string,
  options?: { bypassApproval?: boolean },
) {
  const draft = await getDraftById(id);
  if (!draft) {
    return {
      ok: false as const,
      error: {
        message: "Draft not found.",
        status: 404,
        code: "not_found",
      },
    };
  }

  if (!options?.bypassApproval) {
    const approvalContext = deriveDraftApprovalContext(draft);
    const requiresReview = await shouldGateAction(approvalContext.actionType);

    if (requiresReview) {
      const approval = await createApprovalRequest({
        actionType: approvalContext.actionType,
        payload: approvalContext.payload,
        reason: approvalContext.reason,
        priority: approvalContext.priority,
        requestedBy: "operator",
      });
      const pendingDraft = await updateDraft(draft.id, { status: "pending_approval" });
      return {
        ok: true as const,
        draft: pendingDraft,
        approval,
      };
    }
  }

  if (!postNowAllowed()) {
    const failed = await markDraftState(draft, "failed", {
      message: "Live posting is not allowed without live auth readiness.",
      status: 400,
      code: "policy_blocked",
    });

    return {
      ok: false as const,
      error: failed?.metadata.lastError || {
        message: "Posting policy blocked.",
        status: 400,
        code: "policy_blocked",
      },
    };
  }

  const client = createXClient();

  if (draft.type === "post") {
    const result = await client.createPost(draft.text);
    if (!result.ok) {
      await markDraftState(draft, "failed", {
        message: result.error.message,
        status: result.error.status,
        code: result.error.code,
      });
      return {
        ok: false as const,
        error: {
          message: result.error.message,
          status: result.error.status,
          code: result.error.code,
        },
      };
    }

    const posted = await markDraftState(draft, "posted", null, [result.data.id]);
    return { ok: true as const, draft: posted };
  }

  if (draft.type === "reply") {
    const result = await client.createReply(draft.target_tweet_id || "", draft.text);
    if (!result.ok) {
      await markDraftState(draft, "failed", {
        message: result.error.message,
        status: result.error.status,
        code: result.error.code,
      });
      return {
        ok: false as const,
        error: {
          message: result.error.message,
          status: result.error.status,
          code: result.error.code,
        },
      };
    }

    const posted = await markDraftState(draft, "posted", null, [result.data.id]);
    return { ok: true as const, draft: posted };
  }

  if (draft.type === "quote") {
    const result = await client.createQuote(draft.target_tweet_id || "", draft.text);
    if (!result.ok) {
      await markDraftState(draft, "failed", {
        message: result.error.message,
        status: result.error.status,
        code: result.error.code,
      });
      return {
        ok: false as const,
        error: {
          message: result.error.message,
          status: result.error.status,
          code: result.error.code,
        },
      };
    }

    const posted = await markDraftState(draft, "posted", null, [result.data.id]);
    return { ok: true as const, draft: posted };
  }

  const blocks = draft.metadata.threadBlocks?.filter((block) => block.text.trim().length > 0) || [];
  if (blocks.length === 0) {
    await markDraftState(draft, "failed", {
      message: "Thread drafts need at least one tweet block.",
      status: 400,
      code: "invalid_thread",
    });
    return {
      ok: false as const,
      error: {
        message: "Thread drafts need at least one tweet block.",
        status: 400,
        code: "invalid_thread",
      },
    };
  }

  const postedIds: string[] = [];
  let previousTweetId: string | null = null;

  for (const block of blocks) {
    const result: XServiceResult<XPostRecord> = previousTweetId
      ? await client.createReply(previousTweetId, block.text)
      : await client.createPost(block.text);

    if (!result.ok) {
      await markDraftState(draft, "failed", {
        message: result.error.message,
        status: result.error.status,
        code: result.error.code,
      }, postedIds);
      return {
        ok: false as const,
        error: {
          message: result.error.message,
          status: result.error.status,
          code: result.error.code,
        },
      };
    }

    postedIds.push(result.data.id);
    previousTweetId = result.data.id;
  }

  const posted = await markDraftState(draft, "posted", null, postedIds);
  return { ok: true as const, draft: posted };
}
