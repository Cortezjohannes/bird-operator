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

export interface OperatorStoreSnapshot {
  triage: Record<string, StoredTweetTriage>;
  watchlist: Record<string, StoredWatchlistEntry>;
  drafts: Record<string, import("@/src/features/drafts/types").DraftRecord>;
  approvals: Record<string, import("@/src/features/approvals/types").ApprovalRequest>;
  approvalPolicy: import("@/src/features/approvals/types").ApprovalPolicySettings;
  executionLogs: import("@/src/features/approvals/types").ExecutionLogRecord[];
  profileRevisions: Record<string, import("@/src/features/profile/types").ProfileRevision>;
  profileState: import("@/src/features/profile/types").ProfileState;
  actionLogs: import("@/src/features/logs/types").ActionLog[];
}
