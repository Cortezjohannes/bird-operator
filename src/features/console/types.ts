export type ConsoleMode = "demo" | "live";

export type CapabilityState = "available" | "partial" | "blocked";

export interface CapabilityDiagnostic {
  key: string;
  label: string;
  state: CapabilityState;
  detail: string;
}

export interface QueueItem {
  id: string;
  title: string;
  type: "post" | "reply" | "profile" | "follow";
  status: "draft" | "approval_required" | "scheduled" | "ready";
  dueLabel: string;
}

export interface ActivityItem {
  id: string;
  actor: string;
  action: string;
  target: string;
  occurredAt: string;
  risk: "low" | "medium" | "high";
}

export interface WatchlistItem {
  id: string;
  handle: string;
  name: string;
  note: string;
  lastSeen: string;
}

export interface ProfileSurface {
  displayName: string;
  handle: string;
  bio: string;
  location: string;
  url: string;
}

export interface AnalyticsSnapshot {
  followers: string;
  engagementRate: string;
  responseMedian: string;
  pendingApprovals: number;
}

export interface ConsoleSnapshot {
  mode: ConsoleMode;
  isLiveReady: boolean;
  environmentLabel: string;
  accountLabel: string;
  capabilities: CapabilityDiagnostic[];
  queue: QueueItem[];
  activity: ActivityItem[];
  watchlist: WatchlistItem[];
  profile: ProfileSurface;
  analytics: AnalyticsSnapshot;
  composerDraft: {
    title: string;
    body: string;
  };
}
