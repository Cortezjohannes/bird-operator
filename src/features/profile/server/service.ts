import "server-only";

import { upsertExecutionLog } from "@/src/features/operator-store/server/store";
import {
  getProfileRevisionById,
  getProfileState,
  listProfileRevisions,
  updateProfileState,
  upsertProfileRevision,
} from "@/src/features/operator-store/server/store";
import { sanitizeApprovalValue } from "@/src/features/approvals/server/sanitize";
import { getCurrentConnectedXAccountSummary } from "@/src/features/x-auth/server/connected-account";
import { performXRequest } from "@/src/features/x-client/server/http";
import {
  executeAction,
  logExecutionOutcome,
} from "@/src/features/execution/server/service";
import type { ExecutionLogRecord } from "@/src/features/approvals/types";
import type {
  ProfileDraftPayload,
  ProfileRevision,
} from "@/src/features/profile/types";

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function now() {
  return new Date().toISOString();
}

function extractData<T>(body: unknown, fallback: T): T {
  if (body && typeof body === "object" && "data" in body) {
    return (body as { data: T }).data;
  }
  return fallback;
}

function extractExpandedUrl(data: Record<string, unknown>) {
  const entities =
    data.entities && typeof data.entities === "object"
      ? (data.entities as Record<string, unknown>)
      : null;
  const urlEntity =
    entities?.url && typeof entities.url === "object"
      ? (entities.url as Record<string, unknown>)
      : null;
  const urls = Array.isArray(urlEntity?.urls) ? urlEntity.urls : [];
  const first = urls[0];

  if (first && typeof first === "object") {
    const expanded = (first as Record<string, unknown>).expanded_url;
    if (typeof expanded === "string" && expanded.length > 0) {
      return expanded;
    }
  }

  return typeof data.url === "string" ? data.url : "";
}

async function fetchLiveProfileSurface() {
  const connectedAccount = await getCurrentConnectedXAccountSummary();
  if (!connectedAccount) {
    return {
      revision: null,
      avatarUrl: null,
      detail: "No connected X account is available for live profile readback.",
      degraded: true,
    };
  }

  const response = await performXRequest({
    authStrategy: "oauth2_user",
    endpointLabel: "Read current profile surface",
    path: "/2/users/me",
    query: {
      "user.fields": "description,location,url,entities,profile_image_url",
    },
  });

  if (!response.ok) {
    return {
      revision: {
        id: "profile-live-surface",
        name: connectedAccount.displayName,
        bio: "",
        url: "",
        location: "",
        avatar_asset_ref: null,
        banner_asset_ref: null,
        created_at: connectedAccount.connectedAt,
        applied_at: connectedAccount.lastValidatedAt || connectedAccount.connectedAt,
      } satisfies ProfileRevision,
      avatarUrl: null,
      detail: `Unable to read the current live profile surface. ${response.error.message}`,
      degraded: true,
    };
  }

  const data = extractData<Record<string, unknown>>(response.body, {});

  return {
    revision: {
      id: "profile-live-surface",
      name: String(data.name || connectedAccount.displayName),
      bio: typeof data.description === "string" ? data.description : "",
      url: extractExpandedUrl(data),
      location: typeof data.location === "string" ? data.location : "",
      avatar_asset_ref: null,
      banner_asset_ref: null,
      created_at: connectedAccount.connectedAt,
      applied_at: connectedAccount.lastValidatedAt || connectedAccount.connectedAt,
    } satisfies ProfileRevision,
    avatarUrl:
      typeof data.profile_image_url === "string" ? data.profile_image_url : null,
    detail: "Current profile surface was read live from X for this connected account.",
    degraded: false,
  };
}

async function appendProfileLog(input: Omit<ExecutionLogRecord, "id" | "timestamp">) {
  const record: ExecutionLogRecord = {
    id: createId("exec"),
    timestamp: now(),
    ...input,
  };
  await upsertExecutionLog(record);
  return record;
}

export async function ensureProfileSeedData() {
  const revisions = await listProfileRevisions();
  if (revisions.length > 0) {
    return revisions;
  }
  return [];
}

export async function getProfileEditorState() {
  const revisions = await ensureProfileSeedData();
  const state = await getProfileState();
  const connectedAccount = await getCurrentConnectedXAccountSummary();
  const liveSurface = await fetchLiveProfileSurface();
  const draft =
    (state.currentDraftRevisionId &&
      (await getProfileRevisionById(state.currentDraftRevisionId))) ||
    liveSurface.revision ||
    revisions[0] ||
    null;
  const applied =
    liveSurface.revision ||
    (state.currentAppliedRevisionId &&
      (await getProfileRevisionById(state.currentAppliedRevisionId))) ||
    revisions.find((revision) => revision.applied_at) ||
    draft;

  return {
    draft,
    applied,
    revisions,
    liveReadState: {
      detail: liveSurface.detail,
      degraded: liveSurface.degraded,
      avatarUrl: liveSurface.avatarUrl,
      connectedHandle: connectedAccount ? `@${connectedAccount.username}` : null,
    },
    scopeNotice:
      "Profile surface only: display name, bio, URL, location, avatar, and banner. Password, email, phone, 2FA, billing, privacy, and security settings are intentionally excluded.",
  };
}

export async function saveProfileDraft(input: ProfileDraftPayload) {
  const revision: ProfileRevision = {
    id: createId("profile"),
    name: input.name,
    bio: input.bio,
    url: input.url,
    location: input.location,
    avatar_asset_ref: input.avatar_asset_ref || null,
    banner_asset_ref: input.banner_asset_ref || null,
    created_at: now(),
    applied_at: null,
  };

  await upsertProfileRevision(revision);
  await updateProfileState({ currentDraftRevisionId: revision.id });
  return revision;
}

export async function restoreProfileRevisionToDraft(id: string) {
  const revision = await getProfileRevisionById(id);
  if (!revision) {
    return null;
  }

  const restored: ProfileRevision = {
    ...revision,
    id: createId("profile"),
    created_at: now(),
    applied_at: null,
  };

  await upsertProfileRevision(restored);
  await updateProfileState({ currentDraftRevisionId: restored.id });
  return restored;
}

export async function applyProfileRevision(
  id: string,
  options?: { bypassApproval?: boolean },
) {
  const revision = await getProfileRevisionById(id);
  if (!revision) {
    return {
      ok: false as const,
      error: { message: "Profile revision not found.", status: 404, code: "not_found" },
    };
  }

  await appendProfileLog({
    event_type: "execution_started",
    action_type: "profile_edit",
    actor: options?.bypassApproval ? "approver" : "operator",
    target_id: revision.id,
    message: "Applying profile surface revision.",
    metadata: sanitizeApprovalValue(revision) as Record<string, unknown>,
  });

  const textResult = await executeAction("updateProfileText", {
    name: revision.name,
    description: revision.bio,
    url: revision.url,
    location: revision.location,
  });
  await logExecutionOutcome({
    actor: options?.bypassApproval ? "approver" : "operator",
    actionType: "updateProfileText",
    targetType: "profile",
    targetId: revision.id,
    payloadSummary: "Profile text surface execution",
    result: textResult,
  });

  if (!textResult.ok) {
    await appendProfileLog({
      event_type: "execution_failed",
      action_type: "profile_edit",
      actor: options?.bypassApproval ? "approver" : "operator",
      target_id: revision.id,
      message: textResult.error.message,
      metadata: sanitizeApprovalValue(textResult.error) as Record<string, unknown>,
    });
    return {
      ok: false as const,
      error: {
        message: textResult.error.message,
        status: textResult.error.status,
        code: textResult.error.code,
      },
    };
  }

  if (revision.avatar_asset_ref || revision.banner_asset_ref) {
    const mediaResult = await executeAction("updateProfileMedia", {
      avatarMediaId: revision.avatar_asset_ref || undefined,
      bannerMediaId: revision.banner_asset_ref || undefined,
    });
    await logExecutionOutcome({
      actor: options?.bypassApproval ? "approver" : "operator",
      actionType: "updateProfileMedia",
      targetType: "profile",
      targetId: revision.id,
      payloadSummary: "Profile media surface execution",
      result: mediaResult,
    });

    if (!mediaResult.ok) {
      await appendProfileLog({
        event_type: "execution_failed",
        action_type: "profile_edit",
        actor: options?.bypassApproval ? "approver" : "operator",
        target_id: revision.id,
        message: mediaResult.error.message,
        metadata: sanitizeApprovalValue(mediaResult.error) as Record<string, unknown>,
      });
      return {
        ok: false as const,
        error: {
          message: mediaResult.error.message,
          status: mediaResult.error.status,
          code: mediaResult.error.code,
        },
      };
    }
  }

  const applied: ProfileRevision = {
    ...revision,
    applied_at: now(),
  };
  await upsertProfileRevision(applied);
  await updateProfileState({
    currentAppliedRevisionId: applied.id,
    currentDraftRevisionId: applied.id,
  });

  await appendProfileLog({
    event_type: "execution_succeeded",
    action_type: "profile_edit",
    actor: options?.bypassApproval ? "approver" : "operator",
    target_id: revision.id,
    message: "Profile revision applied successfully.",
    metadata: { revisionId: revision.id },
  });

  return {
    ok: true as const,
    revision: applied,
  };
}
