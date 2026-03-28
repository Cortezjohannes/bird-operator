import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

import { defaultApprovalPolicy } from "@/src/features/approvals/server/policy";
import { getDefaultGrantedCapabilities } from "@/src/features/operator-pairing/policy";
import type {
  ApprovalPolicySettings,
  ApprovalRequest,
  ExecutionLogRecord,
} from "@/src/features/approvals/types";
import type {
  DraftRecord,
} from "@/src/features/drafts/types";
import type {
  ExecutionSettings,
  OperatorStoreSnapshot,
  StoredTweetTriage,
  StoredWatchlistEntry,
  TriageLabel,
} from "@/src/features/operator-store/types";
import type { ActionLog } from "@/src/features/logs/types";
import type {
  OperatorPairingRequest,
  OperatorSession,
} from "@/src/features/operator-pairing/types";
import type { ProfileRevision, ProfileState } from "@/src/features/profile/types";
import type { StoredConnectedXAccount } from "@/src/features/x-auth/types";
import { capabilityOrder } from "@/src/features/x-auth/capabilities";

const dataDir = path.join(process.cwd(), "data");
const storePath = path.join(dataDir, "operator-store.json");

const defaultSnapshot: OperatorStoreSnapshot = {
  triage: {},
  watchlist: {},
  drafts: {},
  approvals: {},
  approvalPolicy: defaultApprovalPolicy(),
  executionLogs: [],
  profileRevisions: {},
  profileState: {
    currentDraftRevisionId: null,
    currentAppliedRevisionId: null,
  },
  actionLogs: [],
  executionSettings: {
    browserFallbackEnabled: false,
  },
  connectedXAccounts: {},
  pairingRequests: {},
  operatorSessions: {},
};

function normalizeRequestedCapabilities(input: unknown) {
  const requested = Array.isArray(input) ? new Set(input) : new Set();
  return capabilityOrder.filter((capability) => requested.has(capability));
}

function getDefaultApprovalCaps(grantedCapabilities: string[]) {
  return grantedCapabilities.filter((capability) => {
    return (
      capability === "post_tweet" ||
      capability === "reply_tweet" ||
      capability === "quote_tweet" ||
      capability === "follow_user" ||
      capability === "update_profile_text" ||
      capability === "update_profile_media"
    );
  });
}

function normalizeOperatorSessionRecord(record: OperatorSession) {
  const requestedCapabilities = normalizeRequestedCapabilities(record.requested_capabilities);
  const mode =
    record.mode === "trusted_operator" ||
    record.mode === "custom" ||
    record.mode === "approval_required"
      ? record.mode
      : "approval_required";
  const grantedCapabilities = normalizeRequestedCapabilities(record.granted_capabilities);
  const normalizedGranted =
    grantedCapabilities.length > 0
      ? grantedCapabilities.filter((capability) => requestedCapabilities.includes(capability))
      : getDefaultGrantedCapabilities(requestedCapabilities);
  const approvalRequiredCapabilities = normalizeRequestedCapabilities(
    record.approval_required_capabilities,
  ).filter((capability) => normalizedGranted.includes(capability));

  return {
    ...record,
    requested_capabilities: requestedCapabilities,
    mode,
    granted_capabilities: normalizedGranted,
    approval_required_capabilities:
      mode === "trusted_operator"
        ? []
        : approvalRequiredCapabilities.length > 0
          ? approvalRequiredCapabilities
          : getDefaultApprovalCaps(normalizedGranted),
  };
}

async function ensureStoreFile() {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(storePath);
  } catch {
    await fs.writeFile(storePath, JSON.stringify(defaultSnapshot, null, 2), "utf8");
  }
}

export async function readOperatorStore() {
  await ensureStoreFile();
  const raw = await fs.readFile(storePath, "utf8");

  try {
    const parsed = JSON.parse(raw) as Partial<OperatorStoreSnapshot>;
    return {
      triage: parsed.triage || {},
      watchlist: parsed.watchlist || {},
      drafts: parsed.drafts || {},
      approvals: parsed.approvals || {},
      approvalPolicy: parsed.approvalPolicy || defaultApprovalPolicy(),
      executionLogs: parsed.executionLogs || [],
      profileRevisions: parsed.profileRevisions || {},
      profileState: parsed.profileState || {
        currentDraftRevisionId: null,
        currentAppliedRevisionId: null,
      },
      actionLogs: parsed.actionLogs || [],
      executionSettings: parsed.executionSettings || {
        browserFallbackEnabled: false,
      },
      connectedXAccounts: parsed.connectedXAccounts || {},
      pairingRequests: parsed.pairingRequests || {},
      operatorSessions: parsed.operatorSessions || {},
    } satisfies OperatorStoreSnapshot;
  } catch {
    return defaultSnapshot;
  }
}

async function writeOperatorStore(snapshot: OperatorStoreSnapshot) {
  await ensureStoreFile();
  await fs.writeFile(storePath, JSON.stringify(snapshot, null, 2), "utf8");
}

export async function setTweetTriageLabel(tweetId: string, label: TriageLabel) {
  const snapshot = await readOperatorStore();
  snapshot.triage[tweetId] = {
    tweetId,
    label,
    updatedAt: new Date().toISOString(),
  } satisfies StoredTweetTriage;
  await writeOperatorStore(snapshot);
  return snapshot.triage[tweetId];
}

export async function addAuthorToWatchlist(userHandle: string, userName: string) {
  const snapshot = await readOperatorStore();
  snapshot.watchlist[userHandle] = {
    userHandle,
    userName,
    addedAt: new Date().toISOString(),
  } satisfies StoredWatchlistEntry;
  await writeOperatorStore(snapshot);
  return snapshot.watchlist[userHandle];
}

export async function listDrafts() {
  const snapshot = await readOperatorStore();
  return Object.values(snapshot.drafts).sort((a, b) => {
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
}

export async function getDraftById(id: string) {
  const snapshot = await readOperatorStore();
  return snapshot.drafts[id] || null;
}

export async function upsertDraft(record: DraftRecord) {
  const snapshot = await readOperatorStore();
  snapshot.drafts[record.id] = record;
  await writeOperatorStore(snapshot);
  return record;
}

export async function deleteDraftById(id: string) {
  const snapshot = await readOperatorStore();
  const existing = snapshot.drafts[id] || null;
  if (existing) {
    delete snapshot.drafts[id];
    await writeOperatorStore(snapshot);
  }
  return existing;
}

export async function listApprovals() {
  const snapshot = await readOperatorStore();
  return Object.values(snapshot.approvals).sort((a, b) => {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export async function getApprovalById(id: string) {
  const snapshot = await readOperatorStore();
  return snapshot.approvals[id] || null;
}

export async function upsertApproval(record: ApprovalRequest) {
  const snapshot = await readOperatorStore();
  snapshot.approvals[record.id] = record;
  await writeOperatorStore(snapshot);
  return record;
}

export async function updateApprovalPolicy(settings?: ApprovalPolicySettings) {
  const snapshot = await readOperatorStore();
  if (settings) {
    snapshot.approvalPolicy = settings;
    await writeOperatorStore(snapshot);
  }
  return snapshot.approvalPolicy;
}

export async function upsertExecutionLog(record: ExecutionLogRecord) {
  const snapshot = await readOperatorStore();
  snapshot.executionLogs = [record, ...snapshot.executionLogs].slice(0, 250);
  await writeOperatorStore(snapshot);
  return record;
}

export async function listExecutionLogs() {
  const snapshot = await readOperatorStore();
  return snapshot.executionLogs;
}

export async function listProfileRevisions() {
  const snapshot = await readOperatorStore();
  return Object.values(snapshot.profileRevisions).sort((a, b) => {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export async function getProfileRevisionById(id: string) {
  const snapshot = await readOperatorStore();
  return snapshot.profileRevisions[id] || null;
}

export async function upsertProfileRevision(record: ProfileRevision) {
  const snapshot = await readOperatorStore();
  snapshot.profileRevisions[record.id] = record;
  await writeOperatorStore(snapshot);
  return record;
}

export async function getProfileState() {
  const snapshot = await readOperatorStore();
  return snapshot.profileState;
}

export async function updateProfileState(nextState: Partial<ProfileState>) {
  const snapshot = await readOperatorStore();
  snapshot.profileState = {
    ...snapshot.profileState,
    ...nextState,
  };
  await writeOperatorStore(snapshot);
  return snapshot.profileState;
}

export async function listActionLogs() {
  const snapshot = await readOperatorStore();
  return snapshot.actionLogs.sort((a, b) => {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
}

export async function appendActionLog(record: ActionLog) {
  const snapshot = await readOperatorStore();
  snapshot.actionLogs = [record, ...snapshot.actionLogs].slice(0, 1000);
  await writeOperatorStore(snapshot);
  return record;
}

export async function getExecutionSettings() {
  const snapshot = await readOperatorStore();
  return snapshot.executionSettings;
}

export async function updateExecutionSettings(settings: Partial<ExecutionSettings>) {
  const snapshot = await readOperatorStore();
  snapshot.executionSettings = {
    ...snapshot.executionSettings,
    ...settings,
  };
  await writeOperatorStore(snapshot);
  return snapshot.executionSettings;
}

export async function getConnectedXAccount(appUserId: string) {
  const snapshot = await readOperatorStore();
  return snapshot.connectedXAccounts[appUserId] || null;
}

export async function upsertConnectedXAccount(record: StoredConnectedXAccount) {
  const snapshot = await readOperatorStore();
  snapshot.connectedXAccounts[record.appUserId] = record;
  await writeOperatorStore(snapshot);
  return record;
}

export async function deleteConnectedXAccount(appUserId: string) {
  const snapshot = await readOperatorStore();
  const existing = snapshot.connectedXAccounts[appUserId] || null;
  if (existing) {
    delete snapshot.connectedXAccounts[appUserId];
    await writeOperatorStore(snapshot);
  }
  return existing;
}

export async function listPairingRequests() {
  const snapshot = await readOperatorStore();
  return Object.values(snapshot.pairingRequests).sort((a, b) => {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  }).map((record) => ({
    ...record,
    requested_capabilities: normalizeRequestedCapabilities(record.requested_capabilities),
  }));
}

export async function getPairingRequestById(id: string) {
  const snapshot = await readOperatorStore();
  return snapshot.pairingRequests[id]
    ? {
        ...snapshot.pairingRequests[id],
        requested_capabilities: normalizeRequestedCapabilities(
          snapshot.pairingRequests[id].requested_capabilities,
        ),
      }
    : null;
}

export async function upsertPairingRequest(record: OperatorPairingRequest) {
  const snapshot = await readOperatorStore();
  snapshot.pairingRequests[record.id] = {
    ...record,
    requested_capabilities: normalizeRequestedCapabilities(record.requested_capabilities),
  };
  await writeOperatorStore(snapshot);
  return snapshot.pairingRequests[record.id];
}

export async function listOperatorSessions() {
  const snapshot = await readOperatorStore();
  return Object.values(snapshot.operatorSessions).sort((a, b) => {
    return new Date(b.paired_at).getTime() - new Date(a.paired_at).getTime();
  }).map(normalizeOperatorSessionRecord);
}

export async function getOperatorSessionById(id: string) {
  const snapshot = await readOperatorStore();
  return snapshot.operatorSessions[id]
    ? normalizeOperatorSessionRecord(snapshot.operatorSessions[id])
    : null;
}

export async function upsertOperatorSession(record: OperatorSession) {
  const snapshot = await readOperatorStore();
  snapshot.operatorSessions[record.id] = normalizeOperatorSessionRecord(record);
  await writeOperatorStore(snapshot);
  return snapshot.operatorSessions[record.id];
}
