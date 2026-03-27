import "server-only";

import type {
  XPostRecord,
  XTimelineEntry,
  XUserSummary,
} from "@/src/features/x-client/types";

export const demoTimeline: XTimelineEntry[] = [
  {
    id: "demo-timeline-1",
    text: "Quiet launch takeaway: the best replies in the first hour were short, specific, and pointed people to one next step instead of a full product tour.",
    authorHandle: "@signal_desk",
    authorName: "Signal Desk",
    createdAt: "2026-03-28T02:15:00.000Z",
    metrics: {
      replies: 18,
      reposts: 44,
      likes: 238,
      bookmarks: 19,
      impressions: 8120,
    },
    unread: false,
  },
  {
    id: "demo-timeline-2",
    text: "We tightened our queue so sensitive actions pause for review instead of slipping through on momentum. Small systems change, huge operator calm.",
    authorHandle: "@ops_bridge",
    authorName: "Ops Bridge",
    createdAt: "2026-03-28T01:42:00.000Z",
    metrics: {
      replies: 7,
      reposts: 16,
      likes: 91,
      bookmarks: 12,
      impressions: 2940,
    },
    unread: true,
  },
  {
    id: "demo-timeline-3",
    text: "Watching for teams that treat mentions like triage instead of vanity metrics. The difference shows up in response quality by day two.",
    authorHandle: "@watchgrid",
    authorName: "Watchgrid",
    createdAt: "2026-03-28T00:58:00.000Z",
    metrics: {
      replies: 11,
      reposts: 29,
      likes: 167,
      bookmarks: 24,
      impressions: 6310,
    },
    unread: true,
  },
];

export const demoMentions: XTimelineEntry[] = [
  {
    id: "demo-mention-1",
    text: "@console_demo are you publishing the recap thread today, or should we point people to the highlights post for now?",
    authorHandle: "@briefwire",
    authorName: "Briefwire",
    createdAt: "2026-03-28T02:48:00.000Z",
    metrics: {
      replies: 3,
      reposts: 2,
      likes: 19,
      bookmarks: 0,
      impressions: 680,
    },
    unread: true,
  },
  {
    id: "demo-mention-2",
    text: "@console_demo thanks for the fast reply yesterday. The approval gate actually made the answer clearer.",
    authorHandle: "@fieldsignal",
    authorName: "Field Signal",
    createdAt: "2026-03-28T00:21:00.000Z",
    metrics: {
      replies: 1,
      reposts: 0,
      likes: 12,
      bookmarks: 0,
      impressions: 390,
    },
    unread: false,
  },
  {
    id: "demo-mention-3",
    text: "@console_demo the dashboard screenshots look sharp. Are you planning a browser fallback for the actions that the API cannot cover cleanly?",
    authorHandle: "@opsradar",
    authorName: "Ops Radar",
    createdAt: "2026-03-27T23:44:00.000Z",
    metrics: {
      replies: 4,
      reposts: 1,
      likes: 23,
      bookmarks: 3,
      impressions: 940,
    },
    unread: true,
  },
];

export const demoUsers: Record<string, XUserSummary> = {
  signal_desk: {
    id: "demo-user-1",
    handle: "@signal_desk",
    name: "Signal Desk",
    description: "Tracks high-signal conversation shifts and operator patterns.",
    metrics: { followers_count: 18640, following_count: 412 },
  },
  ops_bridge: {
    id: "demo-user-2",
    handle: "@ops_bridge",
    name: "Ops Bridge",
    description: "Writes about calm systems, approvals, and operator judgment.",
    metrics: { followers_count: 27110, following_count: 904 },
  },
  console_demo: {
    id: "demo-user-3",
    handle: "@console_demo",
    name: "Console Demo",
    description: "Public-safe mock account for operator workflow demos.",
    metrics: { followers_count: 12480, following_count: 193 },
  },
  watchgrid: {
    id: "demo-user-4",
    handle: "@watchgrid",
    name: "Watchgrid",
    description: "Watches watchlists, mention velocity, and post timing habits.",
    metrics: { followers_count: 16320, following_count: 280 },
  },
  briefwire: {
    id: "demo-user-5",
    handle: "@briefwire",
    name: "Briefwire",
    description: "Concise updates and recap prompts for launch windows.",
    metrics: { followers_count: 9320, following_count: 221 },
  },
  fieldsignal: {
    id: "demo-user-6",
    handle: "@fieldsignal",
    name: "Field Signal",
    description: "Operator-side observations from live rollout rooms.",
    metrics: { followers_count: 11840, following_count: 356 },
  },
  opsradar: {
    id: "demo-user-7",
    handle: "@opsradar",
    name: "Ops Radar",
    description: "Tracks reliability, fallbacks, and execution quality.",
    metrics: { followers_count: 14120, following_count: 308 },
  },
};

export function createDemoPost(text: string): XPostRecord {
  return {
    id: `demo-post-${Math.random().toString(36).slice(2, 10)}`,
    text,
    createdAt: new Date().toISOString(),
  };
}
