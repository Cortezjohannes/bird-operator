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
import { createXClient } from "@/src/features/x-client/server";
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

function seedDemoRevision(): ProfileRevision {
  return {
    id: "profile-demo-1",
    name: "X Operator Console Demo",
    bio: "Mission-control style workspace for deliberate X account operations.",
    url: "https://example.com/operator-console",
    location: "Remote",
    avatar_asset_ref: null,
    banner_asset_ref: null,
    created_at: "2026-03-27T10:00:00.000Z",
    applied_at: "2026-03-27T10:00:00.000Z",
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

  const revision = seedDemoRevision();
  await upsertProfileRevision(revision);
  await updateProfileState({
    currentAppliedRevisionId: revision.id,
    currentDraftRevisionId: revision.id,
  });
  return [revision];
}

export async function getProfileEditorState() {
  const revisions = await ensureProfileSeedData();
  const state = await getProfileState();
  const draft =
    (state.currentDraftRevisionId &&
      (await getProfileRevisionById(state.currentDraftRevisionId))) ||
    revisions[0] ||
    null;
  const applied =
    (state.currentAppliedRevisionId &&
      (await getProfileRevisionById(state.currentAppliedRevisionId))) ||
    revisions.find((revision) => revision.applied_at) ||
    draft;

  return {
    draft,
    applied,
    revisions,
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

  const client = createXClient();

  await appendProfileLog({
    event_type: "execution_started",
    action_type: "profile_edit",
    actor: options?.bypassApproval ? "approver" : "operator",
    target_id: revision.id,
    message: "Applying profile surface revision.",
    metadata: sanitizeApprovalValue(revision) as Record<string, unknown>,
  });

  const textResult = await client.updateProfileText({
    name: revision.name,
    description: revision.bio,
    url: revision.url,
    location: revision.location,
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
    const mediaResult = await client.updateProfileMedia({
      avatarMediaId: revision.avatar_asset_ref || undefined,
      bannerMediaId: revision.banner_asset_ref || undefined,
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
