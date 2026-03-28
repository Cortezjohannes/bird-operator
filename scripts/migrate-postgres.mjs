import fs from "node:fs/promises";
import path from "node:path";

import { Client } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is required to run db:migrate.");
  process.exit(1);
}

const client = new Client({
  connectionString,
  ssl:
    process.env.DATABASE_SSL === "require" ||
    connectionString.includes("sslmode=require") ||
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : undefined,
});

const defaultSnapshot = {
  appUsers: {},
  triage: {},
  watchlist: {},
  drafts: {},
  approvals: {},
  approvalPolicy: {
    preset: "manual",
    actionOverrides: {
      post_tweet: true,
      reply_tweet: true,
      quote_tweet: true,
      thread_post: true,
      follow_user: true,
      profile_edit: true,
      delete_tweet: true,
    },
  },
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

async function readLocalSnapshotIfPresent() {
  const storePath = path.join(process.cwd(), "data", "operator-store.json");

  try {
    const raw = await fs.readFile(storePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function main() {
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS operator_store_state (
      namespace TEXT PRIMARY KEY,
      snapshot JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const existing = await client.query(
    `SELECT namespace FROM operator_store_state WHERE namespace = $1`,
    ["default"],
  );

  if (existing.rowCount === 0) {
    const localSnapshot = await readLocalSnapshotIfPresent();
    const snapshot = localSnapshot || defaultSnapshot;

    await client.query(
      `INSERT INTO operator_store_state (namespace, snapshot, updated_at)
       VALUES ($1, $2::jsonb, NOW())`,
      ["default", JSON.stringify(snapshot)],
    );
    console.log("Initialized operator_store_state.");
  } else {
    console.log("operator_store_state already exists.");
  }

  await client.end();
}

main().catch(async (error) => {
  console.error(error);
  try {
    await client.end();
  } catch {}
  process.exit(1);
});
