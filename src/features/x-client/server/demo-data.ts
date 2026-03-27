import "server-only";

import type {
  XPostRecord,
  XTimelineEntry,
  XUserSummary,
} from "@/src/features/x-client/types";

export const demoTimeline: XTimelineEntry[] = [
  {
    id: "demo-timeline-1",
    text: "Operator note: monitor mention volume after launch window.",
    authorHandle: "@signal_account",
    authorName: "Signal Account",
    createdAt: "2026-03-28T02:15:00.000Z",
    metrics: {
      replies: 18,
      reposts: 41,
      likes: 226,
      bookmarks: 15,
      impressions: 7800,
    },
    unread: false,
  },
  {
    id: "demo-timeline-2",
    text: "New thread draft is waiting for human approval before publishing.",
    authorHandle: "@demo_operator_account",
    authorName: "X Operator Console Demo",
    createdAt: "2026-03-28T01:42:00.000Z",
    metrics: {
      replies: 4,
      reposts: 9,
      likes: 56,
      bookmarks: 7,
      impressions: 2100,
    },
    unread: true,
  },
];

export const demoMentions: XTimelineEntry[] = [
  {
    id: "demo-mention-1",
    text: "@demo_operator_account are you sharing a recap thread today?",
    authorHandle: "@market_voice",
    authorName: "Market Voice",
    createdAt: "2026-03-28T02:48:00.000Z",
    metrics: {
      replies: 2,
      reposts: 1,
      likes: 11,
      bookmarks: 0,
      impressions: 420,
    },
    unread: true,
  },
  {
    id: "demo-mention-2",
    text: "@demo_operator_account thanks for the quick reply yesterday.",
    authorHandle: "@target_account",
    authorName: "Target Account",
    createdAt: "2026-03-28T00:21:00.000Z",
    metrics: {
      replies: 1,
      reposts: 0,
      likes: 7,
      bookmarks: 0,
      impressions: 260,
    },
    unread: false,
  },
];

export const demoUsers: Record<string, XUserSummary> = {
  signal_account: {
    id: "demo-user-1",
    handle: "@signal_account",
    name: "Signal Account",
    description: "High-signal industry watcher.",
    metrics: { followers_count: 18200, following_count: 410 },
  },
  market_voice: {
    id: "demo-user-2",
    handle: "@market_voice",
    name: "Market Voice",
    description: "Tracks major conversation swings.",
    metrics: { followers_count: 25400, following_count: 900 },
  },
  demo_operator_account: {
    id: "demo-user-3",
    handle: "@demo_operator_account",
    name: "X Operator Console Demo",
    description: "Safe mock operator account.",
    metrics: { followers_count: 12400, following_count: 188 },
  },
};

export function createDemoPost(text: string): XPostRecord {
  return {
    id: `demo-post-${Math.random().toString(36).slice(2, 10)}`,
    text,
    createdAt: new Date().toISOString(),
  };
}
