import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

import { defaultApprovalPolicy } from "@/src/features/approvals/server/policy";
import type {
  ApprovalPolicySettings,
  ApprovalRequest,
  ExecutionLogRecord,
} from "@/src/features/approvals/types";
import type {
  DraftRecord,
} from "@/src/features/drafts/types";
import type {
  OperatorStoreSnapshot,
  StoredTweetTriage,
  StoredWatchlistEntry,
  TriageLabel,
} from "@/src/features/operator-store/types";

const dataDir = path.join(process.cwd(), "data");
const storePath = path.join(dataDir, "operator-store.json");

const defaultSnapshot: OperatorStoreSnapshot = {
  triage: {},
  watchlist: {},
  drafts: {},
  approvals: {},
  approvalPolicy: defaultApprovalPolicy(),
  executionLogs: [],
};

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
