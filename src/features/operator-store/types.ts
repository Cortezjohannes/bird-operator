export type TriageLabel =
  | "reply_worthy"
  | "quote_worthy"
  | "ignored"
  | "saved";

export interface StoredTweetTriage {
  tweetId: string;
  label: TriageLabel;
  updatedAt: string;
}

export interface StoredWatchlistEntry {
  userHandle: string;
  userName: string;
  addedAt: string;
}

export interface ExecutionSettings {
  browserFallbackEnabled: boolean;
}

export interface StoredAppUser {
  id: string;
  email: string;
  role: "owner" | "operator";
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export type PersistenceBackend = "file" | "postgres";

export interface OperatorStoreSnapshot {
  appUsers: Record<string, StoredAppUser>;
  triage: Record<string, StoredTweetTriage>;
  watchlist: Record<string, StoredWatchlistEntry>;
  drafts: Record<string, import("@/src/features/drafts/types").DraftRecord>;
  approvals: Record<string, import("@/src/features/approvals/types").ApprovalRequest>;
  approvalPolicy: import("@/src/features/approvals/types").ApprovalPolicySettings;
  executionLogs: import("@/src/features/approvals/types").ExecutionLogRecord[];
  profileRevisions: Record<string, import("@/src/features/profile/types").ProfileRevision>;
  profileState: import("@/src/features/profile/types").ProfileState;
  actionLogs: import("@/src/features/logs/types").ActionLog[];
  executionSettings: ExecutionSettings;
  connectedXAccounts: Record<string, import("@/src/features/x-auth/types").StoredConnectedXAccount>;
  pairingRequests: Record<string, import("@/src/features/operator-pairing/types").OperatorPairingRequest>;
  operatorSessions: Record<string, import("@/src/features/operator-pairing/types").OperatorSession>;
}
