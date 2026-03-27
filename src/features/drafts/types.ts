export type DraftType = "post" | "reply" | "quote" | "thread";

export type DraftStatus =
  | "draft"
  | "pending_approval"
  | "scheduled"
  | "posted"
  | "failed";

export interface DraftThreadBlock {
  id: string;
  text: string;
}

export interface DraftRecord {
  id: string;
  type: DraftType;
  text: string;
  target_tweet_id: string | null;
  target_user_id: string | null;
  status: DraftStatus;
  created_at: string;
  updated_at: string;
  scheduled_for: string | null;
  metadata: {
    threadBlocks?: DraftThreadBlock[];
    lastError?: {
      message: string;
      status: number;
      code: string;
    } | null;
    postedTweetIds?: string[];
  };
}

export interface DraftPayload {
  type: DraftType;
  text: string;
  target_tweet_id?: string | null;
  target_user_id?: string | null;
  status?: DraftStatus;
  scheduled_for?: string | null;
  metadata?: DraftRecord["metadata"];
}
