import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

import { Pool } from "pg";

import { defaultApprovalPolicy } from "@/src/features/approvals/server/policy";
import type {
  ApprovalPolicySettings,
  ApprovalRequest,
  ExecutionLogRecord,
} from "@/src/features/approvals/types";
import type { DraftRecord } from "@/src/features/drafts/types";
import type { ActionLog } from "@/src/features/logs/types";
import { getDefaultGrantedCapabilities } from "@/src/features/operator-pairing/policy";
import type {
  OperatorPairingRequest,
  OperatorSession,
} from "@/src/features/operator-pairing/types";
import type {
  ExecutionSettings,
  OperatorStoreSnapshot,
  PersistenceBackend,
  StoredAppUser,
  StoredTweetTriage,
  StoredWatchlistEntry,
  TriageLabel,
} from "@/src/features/operator-store/types";
import type { ProfileRevision, ProfileState } from "@/src/features/profile/types";
import { capabilityOrder } from "@/src/features/x-auth/capabilities";
import type { StoredConnectedXAccount } from "@/src/features/x-auth/types";

const dataDir = path.join(process.cwd(), "data");
const storePath = path.join(dataDir, "operator-store.json");
const storeNamespace = "default";

const defaultSnapshot: OperatorStoreSnapshot = {
  appUsers: {},
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

let pool: Pool | null = null;
let schemaEnsured = false;

function getDatabaseUrl() {
  return process.env.DATABASE_URL?.trim() || "";
}

function getPersistenceBackend(): PersistenceBackend {
  return getDatabaseUrl() ? "postgres" : "file";
}

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

function normalizeSnapshot(parsed: Partial<OperatorStoreSnapshot>) {
  return {
    appUsers: parsed.appUsers || {},
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
}

async function ensureStoreFile() {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(storePath);
  } catch {
    await fs.writeFile(storePath, JSON.stringify(defaultSnapshot, null, 2), "utf8");
  }
}

function getPool() {
  if (pool) {
    return pool;
  }

  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const shouldUseSsl =
    process.env.DATABASE_SSL === "require" ||
    connectionString.includes("sslmode=require") ||
    process.env.NODE_ENV === "production";

  pool = new Pool({
    connectionString,
    ssl: shouldUseSsl ? { rejectUnauthorized: false } : undefined,
    max: 10,
  });
  return pool;
}

async function ensurePostgresSchema() {
  if (schemaEnsured) {
    return;
  }

  const client = await getPool().connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS operator_store_state (
        namespace TEXT PRIMARY KEY,
        snapshot JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const existing = await client.query(
      `SELECT namespace FROM operator_store_state WHERE namespace = $1`,
      [storeNamespace],
    );

    if (existing.rowCount === 0) {
      await client.query(
        `INSERT INTO operator_store_state (namespace, snapshot, updated_at)
         VALUES ($1, $2::jsonb, NOW())`,
        [storeNamespace, JSON.stringify(defaultSnapshot)],
      );
    }

    schemaEnsured = true;
  } finally {
    client.release();
  }
}

async function readSnapshotFromPostgres() {
  await ensurePostgresSchema();
  const result = await getPool().query(
    `SELECT snapshot FROM operator_store_state WHERE namespace = $1`,
    [storeNamespace],
  );

  if (result.rowCount === 0) {
    return defaultSnapshot;
  }

  return normalizeSnapshot(result.rows[0].snapshot as Partial<OperatorStoreSnapshot>);
}

async function writeSnapshotToPostgres(snapshot: OperatorStoreSnapshot) {
  await ensurePostgresSchema();
  await getPool().query(
    `INSERT INTO operator_store_state (namespace, snapshot, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (namespace)
     DO UPDATE SET snapshot = EXCLUDED.snapshot, updated_at = NOW()`,
    [storeNamespace, JSON.stringify(snapshot)],
  );
}

export async function readOperatorStore() {
  if (getPersistenceBackend() === "postgres") {
    return readSnapshotFromPostgres();
  }

  await ensureStoreFile();
  const raw = await fs.readFile(storePath, "utf8");

  try {
    const parsed = JSON.parse(raw) as Partial<OperatorStoreSnapshot>;
    return normalizeSnapshot(parsed);
  } catch {
    return defaultSnapshot;
  }
}

async function writeOperatorStore(snapshot: OperatorStoreSnapshot) {
  if (getPersistenceBackend() === "postgres") {
    await writeSnapshotToPostgres(snapshot);
    return;
  }

  await ensureStoreFile();
  await fs.writeFile(storePath, JSON.stringify(snapshot, null, 2), "utf8");
}

export async function getPersistenceStatus() {
  const backend = getPersistenceBackend();

  if (backend === "postgres") {
    try {
      await ensurePostgresSchema();
      await getPool().query("SELECT 1");
      return {
        backend,
        configured: true,
        healthy: true,
        message: "Postgres persistence is configured and reachable.",
      };
    } catch (error) {
      return {
        backend,
        configured: true,
        healthy: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to reach the configured Postgres database.",
      };
    }
  }

  return {
    backend,
    configured: false,
    healthy: process.env.NODE_ENV !== "production",
    message:
      process.env.NODE_ENV === "production"
        ? "Production is running without DATABASE_URL. Local file persistence is not acceptable for hosted deployment."
        : "Using local file persistence for local development.",
  };
}

export async function listAppUsers() {
  const snapshot = await readOperatorStore();
  return Object.values(snapshot.appUsers).sort((a, b) => {
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export async function getAppUserById(id: string) {
  const snapshot = await readOperatorStore();
  return snapshot.appUsers[id] || null;
}

export async function upsertAppUser(record: StoredAppUser) {
  const snapshot = await readOperatorStore();
  snapshot.appUsers[record.id] = record;
  await writeOperatorStore(snapshot);
  return record;
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
  return Object.values(snapshot.pairingRequests)
    .sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })
    .map((record) => ({
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
  return Object.values(snapshot.operatorSessions)
    .sort((a, b) => {
      return new Date(b.paired_at).getTime() - new Date(a.paired_at).getTime();
    })
    .map(normalizeOperatorSessionRecord);
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
