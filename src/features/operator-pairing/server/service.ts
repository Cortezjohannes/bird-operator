import "server-only";

import crypto from "node:crypto";

import { shouldGateAction, createApprovalRequest } from "@/src/features/approvals/server/service";
import type { ApprovalActionType } from "@/src/features/approvals/types";
import { getAppBaseUrl } from "@/src/features/auth/server/config";
import { getCurrentSession } from "@/src/features/auth/server/current-session";
import { executeAction } from "@/src/features/execution/server/service";
import { capabilityOrder, capabilityLabels } from "@/src/features/x-auth/capabilities";
import { recordActionLog } from "@/src/features/logs/server/service";
import { getDefaultGrantedCapabilities } from "@/src/features/operator-pairing/policy";
import {
  getOperatorSessionById,
  getPairingRequestById,
  listActionLogs,
  listOperatorSessions,
  listPairingRequests,
  upsertOperatorSession,
  upsertPairingRequest,
} from "@/src/features/operator-store/server/store";
import { getCurrentConnectedXAccount } from "@/src/features/x-auth/server/connected-account";
import { sanitizeErrorMessage } from "@/src/features/x-auth/server/sanitize";
import type {
  CreatePairingRequestInput,
  OperatorPairingRequest,
  OperatorSession,
  OperatorSessionMode,
  OperatorSessionPolicyInput,
  OperatorSessionSummary,
  PairingCreationResponse,
  PairingRequestSummary,
  PairingResolutionPayload,
} from "@/src/features/operator-pairing/types";
import type { ActionExecutionPath } from "@/src/features/logs/types";
import type { XCapability } from "@/src/features/x-auth/types";
import type { ExecutionActionType, ExecutionPayloadMap } from "@/src/features/execution/types";

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function now() {
  return new Date().toISOString();
}

function minutesFromNow(minutes: number) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function hoursFromNow(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function getPairingRequestTtlMinutes() {
  const value = Number(process.env.OPERATOR_PAIRING_REQUEST_TTL_MINUTES || "15");
  if (!Number.isFinite(value) || value <= 0) {
    return 15;
  }
  return Math.round(value);
}

function getOperatorSessionTtlHours() {
  const value = Number(process.env.OPERATOR_SESSION_TTL_HOURS || "24");
  if (!Number.isFinite(value) || value <= 0) {
    return 24;
  }
  return Math.round(value);
}

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function randomToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString("base64url");
}

function createOneTimeCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let index = 0; index < 8; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

function normalizeCode(input: string) {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function maskCode(code: string) {
  const normalized = normalizeCode(code);
  return `****-${normalized.slice(-4)}`;
}

const operatorApprovalActionMap: Partial<Record<XCapability, ApprovalActionType>> = {
  post_tweet: "post_tweet",
  reply_tweet: "reply_tweet",
  quote_tweet: "quote_tweet",
  follow_user: "follow_user",
  update_profile_text: "profile_edit",
  update_profile_media: "profile_edit",
};

const capabilityByExecutionAction: Partial<Record<ExecutionActionType, XCapability>> = {
  getTimeline: "read_timeline",
  getMentions: "read_mentions",
  createPost: "post_tweet",
  createReply: "reply_tweet",
  createQuote: "quote_tweet",
  likeTweet: "like_tweet",
  repostTweet: "repost_tweet",
  bookmarkTweet: "bookmark_tweet",
  followUser: "follow_user",
  unfollowUser: "unfollow_user",
  updateProfileText: "update_profile_text",
  updateProfileMedia: "update_profile_media",
  getCapabilities: "analytics_read",
};

function normalizeCapabilityList(input: readonly string[] | undefined | null): XCapability[] {
  const requested = new Set(input || []);
  return capabilityOrder.filter((capability) => requested.has(capability));
}

function getDefaultApprovalRequiredCapabilities(grantedCapabilities: XCapability[]) {
  return grantedCapabilities.filter((capability) => operatorApprovalActionMap[capability]);
}

function normalizeSessionPolicy(input: {
  requestedCapabilities: XCapability[];
  policy?: OperatorSessionPolicyInput;
}) {
  const requestedSet = new Set(input.requestedCapabilities);
  const requestedCapabilities = capabilityOrder.filter((capability) =>
    requestedSet.has(capability),
  );

  const mode: OperatorSessionMode = input.policy?.mode || "approval_required";
  const desiredGranted =
    input.policy?.grantedCapabilities && input.policy.grantedCapabilities.length > 0
      ? normalizeCapabilityList(input.policy.grantedCapabilities)
      : getDefaultGrantedCapabilities(requestedCapabilities);
  const grantedCapabilities = desiredGranted.filter((capability) =>
    requestedSet.has(capability),
  );
  const desiredApprovalRequired = normalizeCapabilityList(
    input.policy?.approvalRequiredCapabilities,
  ).filter((capability) => grantedCapabilities.includes(capability));

  const approvalRequiredCapabilities =
    mode === "trusted_operator"
      ? []
      : mode === "custom"
        ? desiredApprovalRequired
        : getDefaultApprovalRequiredCapabilities(grantedCapabilities);

  return {
    mode,
    grantedCapabilities,
    approvalRequiredCapabilities,
    expiresAt: input.policy?.expiresAt || null,
  };
}

function diffCapabilities(previous: XCapability[], next: XCapability[]) {
  const previousSet = new Set(previous);
  const nextSet = new Set(next);
  return {
    added: capabilityOrder.filter(
      (capability) => nextSet.has(capability) && !previousSet.has(capability),
    ),
    removed: capabilityOrder.filter(
      (capability) => previousSet.has(capability) && !nextSet.has(capability),
    ),
  };
}

function formatCapabilityList(capabilities: XCapability[]) {
  if (capabilities.length === 0) {
    return "none";
  }

  return capabilities.map((capability) => capabilityLabels[capability]).join(", ");
}

function summarizeRecentActions(
  sessionId: string,
  actionLogs: Awaited<ReturnType<typeof listActionLogs>>,
) {
  return actionLogs
    .filter((entry) => entry.operator_session_id === sessionId)
    .slice(0, 4)
    .map((entry) => ({
      id: entry.id,
      timestamp: entry.timestamp,
      actionType: entry.action_type,
      resultStatus: entry.result_status,
      resultExcerpt: entry.result_excerpt,
      executionPath: entry.execution_path,
    }));
}

async function logOperatorAction(input: {
  actor: string;
  actionType: string;
  targetType: "tweet" | "user" | "profile" | "timeline" | "mention" | "approval" | "draft" | "settings" | "pairing_request" | "operator_session" | "x_account" | "system";
  targetId?: string | null;
  payloadSummary: string;
  resultStatus: "success" | "failed" | "queued" | "skipped";
  resultExcerpt: string;
  operatorSession: OperatorSession;
  relatedTweetId?: string | null;
  executionPath: ActionExecutionPath;
  authMethod?: "system" | "demo" | "oauth1" | "oauth2_user" | "bearer" | "client_credentials" | "none";
}) {
  return recordActionLog({
    actor: input.actor,
    actorType: "operator",
    actionType: input.actionType,
    targetType: input.targetType,
    targetId: input.targetId || null,
    payloadSummary: input.payloadSummary,
    resultStatus: input.resultStatus,
    resultExcerpt: input.resultExcerpt,
    authMethod: input.authMethod || "system",
    relatedTweetId: input.relatedTweetId || null,
    operatorSessionId: input.operatorSession.id,
    operatorSessionMode: input.operatorSession.mode,
    executionPath: input.executionPath,
  });
}

function summarizeRequest(record: OperatorPairingRequest): PairingRequestSummary {
  return {
    id: record.id,
    status: record.status,
    createdAt: record.created_at,
    expiresAt: record.expires_at,
    approvedAt: record.approved_at,
    rejectedAt: record.rejected_at,
    revokedAt: record.revoked_at,
    operatorInstanceId: record.operator_instance_id,
    operatorLabel: record.operator_label,
    operatorFingerprint: record.operator_fingerprint,
    requestedCapabilities: record.requested_capabilities,
    requestedScopeSummary: record.requested_scope_summary,
    oneTimeCodeDisplay: record.one_time_code_display,
    approvedByUserId: record.approved_by_user_id,
    connectedXAccountId: record.connected_x_account_id,
    operatorSessionId: record.operator_session_id,
  };
}

function summarizeSession(
  record: OperatorSession,
  actionLogs: Awaited<ReturnType<typeof listActionLogs>> = [],
): OperatorSessionSummary {
  return {
    id: record.id,
    operatorInstanceId: record.operator_instance_id,
    operatorLabel: record.operator_label,
    fingerprintMetadata: record.fingerprint_metadata,
    connectedXAccountId: record.connected_x_account_id,
    pairedByUserId: record.paired_by_user_id,
    requestedCapabilities: record.requested_capabilities,
    mode: record.mode,
    grantedCapabilities: record.granted_capabilities,
    approvalRequiredCapabilities: record.approval_required_capabilities,
    status: record.status,
    pairedAt: record.paired_at,
    expiresAt: record.expires_at,
    revokedAt: record.revoked_at,
    lastSeenAt: record.last_seen_at,
    recentActions: summarizeRecentActions(record.id, actionLogs),
  };
}

function requestIsExpired(record: OperatorPairingRequest) {
  return (
    record.status === "pending" &&
    new Date(record.expires_at).getTime() <= Date.now()
  );
}

function sessionIsExpired(record: OperatorSession) {
  return (
    record.status === "active" &&
    record.expires_at !== null &&
    new Date(record.expires_at).getTime() <= Date.now()
  );
}

async function sweepExpiredState() {
  const [requests, sessions] = await Promise.all([
    listPairingRequests(),
    listOperatorSessions(),
  ]);

  await Promise.all([
    ...requests
      .filter(requestIsExpired)
      .map(async (request) => {
        const expired: OperatorPairingRequest = {
          ...request,
          status: "expired",
        };
        await upsertPairingRequest(expired);
        await recordActionLog({
          actor: request.operator_instance_id,
          actorType: "operator",
          actionType: "pairing.expired",
          targetType: "pairing_request",
          targetId: request.id,
          payloadSummary: `Pairing request for ${request.operator_label} expired.`,
          resultStatus: "skipped",
          resultExcerpt: "Pending pairing request expired before approval.",
          authMethod: "system",
        });
      }),
    ...sessions
      .filter(sessionIsExpired)
      .map(async (session) => {
        const expired: OperatorSession = {
          ...session,
          status: "expired",
        };
        await upsertOperatorSession(expired);
        await recordActionLog({
          actor: session.paired_by_user_id,
          actorType: "system",
          actionType: "operator_session.expired",
          targetType: "operator_session",
          targetId: session.id,
          payloadSummary: `Operator session for ${session.operator_label} expired.`,
          resultStatus: "skipped",
          resultExcerpt: "Active operator session expired automatically.",
          authMethod: "system",
          operatorSessionId: session.id,
          operatorSessionMode: session.mode,
          executionPath: "direct",
        });
      }),
  ]);
}

async function requireOwnerContext() {
  const session = await getCurrentSession();
  if (!session) {
    throw new Error("Owner session is required.");
  }
  return session.user;
}

function buildApprovalUrl(token: string) {
  const baseUrl = getAppBaseUrl();
  if (!baseUrl) {
    throw new Error("APP_BASE_URL is required to generate approval links.");
  }

  const url = new URL("/operators/approve", baseUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

async function findMatchingRequest(
  matcher: (record: OperatorPairingRequest) => boolean,
) {
  await sweepExpiredState();
  const requests = await listPairingRequests();
  return requests.find((record) => matcher(record)) || null;
}

async function createOperatorSessionFromApproval(input: {
  request: OperatorPairingRequest;
  pairedByUserId: string;
  connectedXAccountId: string;
  policy?: OperatorSessionPolicyInput;
}) {
  const policy = normalizeSessionPolicy({
    requestedCapabilities: input.request.requested_capabilities,
    policy: input.policy,
  });
  const session: OperatorSession = {
    id: createId("op-session"),
    operator_instance_id: input.request.operator_instance_id,
    operator_label: input.request.operator_label,
    fingerprint_metadata: input.request.operator_fingerprint,
    connected_x_account_id: input.connectedXAccountId,
    paired_by_user_id: input.pairedByUserId,
    requested_capabilities: input.request.requested_capabilities,
    mode: policy.mode,
    granted_capabilities: policy.grantedCapabilities,
    approval_required_capabilities: policy.approvalRequiredCapabilities,
    status: "active",
    paired_at: now(),
    expires_at: policy.expiresAt || hoursFromNow(getOperatorSessionTtlHours()),
    revoked_at: null,
    last_seen_at: null,
    lease_token_hash: null,
  };

  await upsertOperatorSession(session);
  await recordActionLog({
    actor: input.pairedByUserId,
    actorType: "owner",
    actionType: "operator_session.activated",
    targetType: "operator_session",
    targetId: session.id,
    payloadSummary: `Activated operator session for ${session.operator_label} in ${session.mode} mode.`,
    resultStatus: "success",
    resultExcerpt: `Operator session is active with ${formatCapabilityList(session.granted_capabilities)}.`,
    authMethod: "system",
    operatorSessionId: session.id,
    operatorSessionMode: session.mode,
    executionPath: "direct",
  });
  return session;
}

export async function createPairingRequest(
  input: CreatePairingRequestInput,
): Promise<PairingCreationResponse> {
  const requestedCapabilities = normalizeCapabilityList(input.requestedCapabilities);
  const requestId = createId("pair");
  const createdAt = now();
  const expiresAt = minutesFromNow(getPairingRequestTtlMinutes());
  const code = createOneTimeCode();
  const approvalLinkToken = randomToken(24);
  const pollToken = randomToken(24);
  const approvalUrl = buildApprovalUrl(approvalLinkToken);

  const request: OperatorPairingRequest = {
    id: requestId,
    status: "pending",
    created_at: createdAt,
    expires_at: expiresAt,
    approved_at: null,
    rejected_at: null,
    revoked_at: null,
    operator_instance_id: input.operatorInstanceId,
    operator_label: input.operatorLabel.trim(),
    operator_fingerprint: input.operatorFingerprint,
    requested_capabilities: requestedCapabilities,
    requested_scope_summary:
      input.requestedScopeSummary || requestedCapabilities.join(", "),
    one_time_code_hash: sha256(normalizeCode(code)),
    one_time_code_display: maskCode(code),
    approval_link_token_hash: sha256(approvalLinkToken),
    poll_token_hash: sha256(pollToken),
    approved_by_user_id: null,
    connected_x_account_id: null,
    operator_session_id: null,
    session_token_claimed_at: null,
  };

  await upsertPairingRequest(request);
  await recordActionLog({
    actor: input.operatorInstanceId,
    actorType: "operator",
    actionType: "pairing.requested",
    targetType: "pairing_request",
    targetId: request.id,
    payloadSummary: `Operator ${input.operatorLabel} requested pairing.`,
    resultStatus: "queued",
    resultExcerpt: `Pairing request created with ${getPairingRequestTtlMinutes()} minute TTL.`,
    authMethod: "system",
  });
  await recordActionLog({
    actor: input.operatorInstanceId,
    actorType: "operator",
    actionType: "pairing.credentials_issued",
    targetType: "pairing_request",
    targetId: request.id,
    payloadSummary: `Issued one-time approval link and code for ${input.operatorLabel}.`,
    resultStatus: "queued",
    resultExcerpt: "Approval link and pairing code are active until approval, rejection, revocation, or expiry.",
    authMethod: "system",
  });

  return {
    requestId,
    expiresAt,
    oneTimeCode: code,
    approvalUrl,
    pollToken,
  };
}

export async function resolvePairingRequest(input: {
  token?: string | null;
  code?: string | null;
}): Promise<PairingResolutionPayload> {
  if (input.token) {
    const request = await findMatchingRequest((record) => {
      return (
        record.status === "pending" &&
        record.approval_link_token_hash === sha256(input.token || "")
      );
    });

    return {
      request: request ? summarizeRequest(request) : null,
      matchedBy: request ? "approval_link" : null,
    };
  }

  if (input.code) {
    const normalizedCode = normalizeCode(input.code);
    const request = await findMatchingRequest((record) => {
      return (
        record.status === "pending" &&
        record.one_time_code_hash === sha256(normalizedCode)
      );
    });

    return {
      request: request ? summarizeRequest(request) : null,
      matchedBy: request ? "code" : null,
    };
  }

  return {
    request: null,
    matchedBy: null,
  };
}

export async function listPendingPairingRequests() {
  await sweepExpiredState();
  const requests = await listPairingRequests();
  return requests.map(summarizeRequest);
}

export async function listActiveOperatorSessions() {
  await sweepExpiredState();
  const [sessions, actionLogs] = await Promise.all([
    listOperatorSessions(),
    listActionLogs(),
  ]);
  return sessions.map((session) => summarizeSession(session, actionLogs));
}

export async function approvePairingRequest(
  requestId: string,
  policy?: OperatorSessionPolicyInput,
) {
  const user = await requireOwnerContext();
  const request = await getPairingRequestById(requestId);
  if (!request) {
    return {
      ok: false as const,
      message: "Pairing request not found.",
    };
  }

  await sweepExpiredState();
  const fresh = await getPairingRequestById(requestId);
  if (!fresh || fresh.status !== "pending") {
    return {
      ok: false as const,
      message: "Pairing request is no longer pending.",
    };
  }

  const connected = await getCurrentConnectedXAccount();
  if (!connected) {
    return {
      ok: false as const,
      message: "Connect an X account before approving an operator pairing.",
    };
  }

  const session = await createOperatorSessionFromApproval({
    request: fresh,
    pairedByUserId: user.id,
    connectedXAccountId: connected.xUserId,
    policy,
  });

  const approved: OperatorPairingRequest = {
    ...fresh,
    status: "approved",
    approved_at: now(),
    approved_by_user_id: user.id,
    connected_x_account_id: connected.xUserId,
    operator_session_id: session.id,
  };
  await upsertPairingRequest(approved);
  await recordActionLog({
    actor: user.id,
    actorType: "owner",
    actionType: "pairing.approved",
    targetType: "pairing_request",
    targetId: approved.id,
    payloadSummary: `Approved pairing for ${approved.operator_label} in ${session.mode} mode.`,
    resultStatus: "success",
    resultExcerpt: "Pairing request approved and operator session activated.",
    authMethod: "system",
    operatorSessionId: session.id,
    operatorSessionMode: session.mode,
    executionPath: "direct",
  });

  const actionLogs = await listActionLogs();
  return {
    ok: true as const,
    request: summarizeRequest(approved),
    session: summarizeSession(session, actionLogs),
  };
}

export async function rejectPairingRequest(requestId: string) {
  const user = await requireOwnerContext();
  const request = await getPairingRequestById(requestId);
  if (!request) {
    return {
      ok: false as const,
      message: "Pairing request not found.",
    };
  }

  await sweepExpiredState();
  const fresh = await getPairingRequestById(requestId);
  if (!fresh || fresh.status !== "pending") {
    return {
      ok: false as const,
      message: "Pairing request is no longer pending.",
    };
  }

  const rejected: OperatorPairingRequest = {
    ...fresh,
    status: "rejected",
    rejected_at: now(),
    approved_by_user_id: user.id,
  };
  await upsertPairingRequest(rejected);
  await recordActionLog({
    actor: user.id,
    actorType: "owner",
    actionType: "pairing.rejected",
    targetType: "pairing_request",
    targetId: rejected.id,
    payloadSummary: `Rejected pairing for ${rejected.operator_label}.`,
    resultStatus: "success",
    resultExcerpt: "Pairing request rejected by owner.",
    authMethod: "system",
  });

  return {
    ok: true as const,
    request: summarizeRequest(rejected),
  };
}

export async function revokeOperatorSession(sessionId: string) {
  const user = await requireOwnerContext();
  const session = await getOperatorSessionById(sessionId);
  if (!session) {
    return {
      ok: false as const,
      message: "Operator session not found.",
    };
  }

  if (session.status !== "active") {
    return {
      ok: false as const,
      message: "Operator session is no longer active.",
    };
  }

  const revokedAt = now();
  const revokedSession: OperatorSession = {
    ...session,
    status: "revoked",
    revoked_at: revokedAt,
  };
  await upsertOperatorSession(revokedSession);

  const requests = await listPairingRequests();
  const linked = requests.find((request) => request.operator_session_id === session.id);
  if (linked && linked.status === "approved") {
    await upsertPairingRequest({
      ...linked,
      status: "revoked",
      revoked_at: revokedAt,
    });
  }

  await recordActionLog({
    actor: user.id,
    actorType: "owner",
    actionType: "operator_session.revoked",
    targetType: "operator_session",
    targetId: session.id,
    payloadSummary: `Revoked operator session for ${session.operator_label}.`,
    resultStatus: "success",
    resultExcerpt: "Operator session was revoked immediately.",
    authMethod: "system",
    operatorSessionId: session.id,
    operatorSessionMode: session.mode,
    executionPath: "direct",
  });

  const actionLogs = await listActionLogs();
  return {
    ok: true as const,
    session: summarizeSession(revokedSession, actionLogs),
  };
}

export async function updateOperatorSessionPolicy(
  sessionId: string,
  policyInput: OperatorSessionPolicyInput,
) {
  const user = await requireOwnerContext();
  const session = await getOperatorSessionById(sessionId);
  if (!session) {
    return {
      ok: false as const,
      message: "Operator session not found.",
    };
  }

  if (session.status !== "active") {
    return {
      ok: false as const,
      message: "Only active operator sessions can be edited.",
    };
  }

  const normalized = normalizeSessionPolicy({
    requestedCapabilities: session.requested_capabilities,
    policy: policyInput,
  });

  const updated: OperatorSession = {
    ...session,
    mode: normalized.mode,
    granted_capabilities: normalized.grantedCapabilities,
    approval_required_capabilities: normalized.approvalRequiredCapabilities,
    expires_at:
      normalized.expiresAt === null || normalized.expiresAt === ""
        ? session.expires_at
        : normalized.expiresAt,
  };

  await upsertOperatorSession(updated);

  const modeChanged = session.mode !== updated.mode;
  const grantedDiff = diffCapabilities(
    session.granted_capabilities,
    updated.granted_capabilities,
  );
  const approvalDiff = diffCapabilities(
    session.approval_required_capabilities,
    updated.approval_required_capabilities,
  );

  const details = [
    modeChanged ? `mode ${session.mode} -> ${updated.mode}` : null,
    grantedDiff.added.length > 0
      ? `granted +${formatCapabilityList(grantedDiff.added)}`
      : null,
    grantedDiff.removed.length > 0
      ? `granted -${formatCapabilityList(grantedDiff.removed)}`
      : null,
    approvalDiff.added.length > 0
      ? `approval +${formatCapabilityList(approvalDiff.added)}`
      : null,
    approvalDiff.removed.length > 0
      ? `approval -${formatCapabilityList(approvalDiff.removed)}`
      : null,
  ]
    .filter(Boolean)
    .join("; ");

  await recordActionLog({
    actor: user.id,
    actorType: "owner",
    actionType: "operator_session.policy_updated",
    targetType: "operator_session",
    targetId: updated.id,
    payloadSummary: details || `Updated ${updated.operator_label} session policy.`,
    resultStatus: "success",
    resultExcerpt: `Session now runs in ${updated.mode} mode with ${formatCapabilityList(updated.granted_capabilities)}.`,
    authMethod: "system",
    operatorSessionId: updated.id,
    operatorSessionMode: updated.mode,
    executionPath: "direct",
  });

  const actionLogs = await listActionLogs();
  return {
    ok: true as const,
    session: summarizeSession(updated, actionLogs),
  };
}

function getExecutionCapability(action: ExecutionActionType) {
  return capabilityByExecutionAction[action] || null;
}

async function getActiveOperatorSessionByLease(token: string) {
  if (!token) {
    return null;
  }

  await sweepExpiredState();
  const sessions = await listOperatorSessions();
  const matched = sessions.find((session) => {
    return session.status === "active" && session.lease_token_hash === sha256(token);
  });

  if (!matched) {
    return null;
  }

  const touched: OperatorSession = {
    ...matched,
    last_seen_at: now(),
  };
  await upsertOperatorSession(touched);
  return touched;
}

function sessionHasCapability(session: OperatorSession, capability: XCapability) {
  return session.granted_capabilities.includes(capability);
}

async function getApprovalDecision(session: OperatorSession, capability: XCapability) {
  const approvalAction = operatorApprovalActionMap[capability] || null;
  if (!approvalAction) {
    return {
      approvalAction: null,
      requiresApproval: false,
    };
  }

  if (session.mode === "trusted_operator") {
    return {
      approvalAction,
      requiresApproval: false,
    };
  }

  if (session.mode === "custom") {
    return {
      approvalAction,
      requiresApproval: session.approval_required_capabilities.includes(capability),
    };
  }

  return {
    approvalAction,
    requiresApproval: await shouldGateAction(approvalAction),
  };
}

function isOwnerOnlyExecutionAction(action: string) {
  return !getExecutionCapability(action as ExecutionActionType);
}

async function queueOperatorApproval(input: {
  session: OperatorSession;
  capability: XCapability;
  action: ExecutionActionType;
  payload: ExecutionPayloadMap[ExecutionActionType];
  approvalAction: ApprovalActionType;
}) {
  const approval = await createApprovalRequest({
    actionType: input.approvalAction,
    payload: {
      operatorSessionId: input.session.id,
      operatorInstanceId: input.session.operator_instance_id,
      operatorLabel: input.session.operator_label,
      operatorMode: input.session.mode,
      capability: input.capability,
      operatorExecution: {
        action: input.action,
        payload: input.payload,
      },
    },
    reason: `Operator ${input.session.operator_label} requested ${capabilityLabels[input.capability]}.`,
    priority: "high",
    requestedBy: input.session.operator_instance_id,
  });

  await logOperatorAction({
    actor: input.session.operator_instance_id,
    actionType: `operator.${input.action}`,
    targetType: "approval",
    targetId: approval.id,
    payloadSummary: `Queued ${capabilityLabels[input.capability]} for owner review.`,
    resultStatus: "queued",
    resultExcerpt: `${capabilityLabels[input.capability]} now requires approval for this session.`,
    operatorSession: input.session,
    executionPath: "approval_gated",
  });

  return approval;
}

export async function executeApprovedOperatorAction(input: {
  sessionId: string;
  action: ExecutionActionType;
  payload: ExecutionPayloadMap[ExecutionActionType];
  reviewer?: string;
}) {
  const session = await getOperatorSessionById(input.sessionId);
  if (!session || session.status !== "active") {
    return {
      ok: false as const,
      message: "Operator session is no longer active.",
    };
  }

  const capability = getExecutionCapability(input.action);
  if (!capability || !sessionHasCapability(session, capability)) {
    return {
      ok: false as const,
      message: "Operator session is not granted for this action.",
    };
  }

  const result = await executeAction(input.action, input.payload as never);
  await recordActionLog({
    actor: input.reviewer || session.operator_instance_id,
    actorType: input.reviewer ? "owner" : "operator",
    actionType: `operator.${input.action}`,
    targetType: capability.startsWith("read_") ? "timeline" : capability.includes("profile") ? "profile" : capability.includes("follow") ? "user" : "tweet",
    payloadSummary: `Executed ${capabilityLabels[capability]} for ${session.operator_label}.`,
    resultStatus: result.ok ? "success" : "failed",
    resultExcerpt: result.ok
      ? "Approved operator action executed successfully."
      : result.error.message,
    authMethod:
      result.metadata.mode === "demo" ? "demo" : result.metadata.authMethod,
    operatorSessionId: session.id,
    operatorSessionMode: session.mode,
    executionPath: "auto_executed",
  });

  if (!result.ok) {
    return {
      ok: false as const,
      message: result.error.message,
    };
  }

  return {
    ok: true as const,
    result: result.data,
  };
}

export async function executeOperatorSessionAction(input: {
  leaseToken: string;
  action: ExecutionActionType;
  payload: ExecutionPayloadMap[ExecutionActionType];
}) {
  const session = await getActiveOperatorSessionByLease(input.leaseToken);
  if (!session) {
    return {
      ok: false as const,
      status: 401,
      message: "Operator session is invalid, revoked, or expired.",
    };
  }

  if (isOwnerOnlyExecutionAction(input.action)) {
    await logOperatorAction({
      actor: session.operator_instance_id,
      actionType: `operator.${input.action}`,
      targetType: "system",
      payloadSummary: `Blocked owner-only action attempt from ${session.operator_label}.`,
      resultStatus: "skipped",
      resultExcerpt: "This action remains owner-only.",
      operatorSession: session,
      executionPath: "owner_only_blocked",
    });
    return {
      ok: false as const,
      status: 403,
      message: "This action is owner-only.",
    };
  }

  const capability = getExecutionCapability(input.action);
  if (!capability) {
    return {
      ok: false as const,
      status: 400,
      message: "Unsupported operator action.",
    };
  }

  if (!sessionHasCapability(session, capability)) {
    await logOperatorAction({
      actor: session.operator_instance_id,
      actionType: `operator.${input.action}`,
      targetType: capability.includes("profile")
        ? "profile"
        : capability.includes("follow")
          ? "user"
          : capability.startsWith("read_")
            ? "timeline"
            : "tweet",
      payloadSummary: `Attempted ${capabilityLabels[capability]} without a grant.`,
      resultStatus: "skipped",
      resultExcerpt: "Capability is not granted for this operator session.",
      operatorSession: session,
      executionPath: "direct",
    });
    return {
      ok: false as const,
      status: 403,
      message: "This capability is not granted for the operator session.",
    };
  }

  const approvalDecision = await getApprovalDecision(session, capability);
  if (approvalDecision.requiresApproval && approvalDecision.approvalAction) {
    const approval = await queueOperatorApproval({
      session,
      capability,
      action: input.action,
      payload: input.payload,
      approvalAction: approvalDecision.approvalAction,
    });

    return {
      ok: true as const,
      status: 202,
      queued: true,
      approvalId: approval.id,
      session: summarizeSession(session, await listActionLogs()),
    };
  }

  const result = await executeAction(input.action, input.payload as never);
  await logOperatorAction({
    actor: session.operator_instance_id,
    actionType: `operator.${input.action}`,
    targetType: capability.includes("profile")
      ? "profile"
      : capability.includes("follow")
        ? "user"
        : capability.startsWith("read_")
          ? capability === "read_mentions"
            ? "mention"
            : "timeline"
          : "tweet",
    payloadSummary: `Executed ${capabilityLabels[capability]} in ${session.mode} mode.`,
    resultStatus: result.ok ? "success" : "failed",
    resultExcerpt: result.ok ? "Operator action executed through the app backend." : result.error.message,
    operatorSession: session,
    executionPath: session.mode === "trusted_operator" ? "auto_executed" : "direct",
    authMethod:
      result.metadata.mode === "demo" ? "demo" : result.metadata.authMethod,
  });

  if (!result.ok) {
    return {
      ok: false as const,
      status: result.error.status || 500,
      message: result.error.message,
      error: result.error,
    };
  }

  return {
    ok: true as const,
    status: 200,
    queued: false,
    result: result.data,
    session: summarizeSession(session, await listActionLogs()),
  };
}

export async function getPairingRequestStatusForOperator(input: {
  requestId: string;
  pollToken: string;
}) {
  await sweepExpiredState();
  const request = await getPairingRequestById(input.requestId);
  if (
    !request ||
    request.poll_token_hash !== sha256(input.pollToken)
  ) {
    return {
      ok: false as const,
      message: "Pairing request status is unavailable.",
    };
  }

  let leaseToken: string | null = null;
  let sessionSummary: OperatorSessionSummary | null = null;

  if (request.status === "approved" && request.operator_session_id) {
    const session = await getOperatorSessionById(request.operator_session_id);
    if (session) {
      sessionSummary = summarizeSession(session, await listActionLogs());
      if (!request.session_token_claimed_at) {
        leaseToken = randomToken(24);
        await upsertOperatorSession({
          ...session,
          lease_token_hash: sha256(leaseToken),
        });
        await upsertPairingRequest({
          ...request,
          session_token_claimed_at: now(),
        });
        await recordActionLog({
          actor: request.operator_instance_id,
          actorType: "operator",
          actionType: "operator_session.lease_issued",
          targetType: "operator_session",
          targetId: session.id,
          payloadSummary: `Issued operator session lease for ${request.operator_label}.`,
          resultStatus: "success",
          resultExcerpt: "Operator claimed its app-level session lease.",
          authMethod: "system",
          operatorSessionId: session.id,
          operatorSessionMode: session.mode,
          executionPath: "direct",
        });
      }
    }
  }

  return {
    ok: true as const,
    request: summarizeRequest(request),
    session: sessionSummary,
    leaseToken,
  };
}

export async function getPairingApprovalPageState(token: string) {
  const resolution = await resolvePairingRequest({ token });
  return resolution.request;
}

export async function verifyOperatorSessionLease(token: string) {
  const matched = await getActiveOperatorSessionByLease(token);
  if (!matched) {
    return null;
  }

  return summarizeSession(matched, await listActionLogs());
}

export function sanitizePairingError(error: unknown) {
  return sanitizeErrorMessage(error);
}
