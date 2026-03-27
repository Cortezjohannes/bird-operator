import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

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
