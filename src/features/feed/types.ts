import type { TriageLabel } from "@/src/features/operator-store/types";
import type { XTimelineEntry } from "@/src/features/x-client/types";

export interface FeedTweet extends XTimelineEntry {
  triageLabel: TriageLabel | null;
  inWatchlist: boolean;
}
