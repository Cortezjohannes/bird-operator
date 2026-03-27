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
}
