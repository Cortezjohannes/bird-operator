import "server-only";

import { getConsoleRuntime } from "@/src/features/console/server/runtime";
import { getDrafts } from "@/src/features/drafts/server/service";
import { getActionLogs } from "@/src/features/logs/server/service";
import type { AnalyticsSnapshot } from "@/src/features/analytics/types";
import type { ActionLog } from "@/src/features/logs/types";

const demoAnalytics: Omit<AnalyticsSnapshot, "sourceLogs"> = {
  postsPerDay: [
    { day: "2026-03-24", count: 2 },
    { day: "2026-03-25", count: 1 },
    { day: "2026-03-26", count: 3 },
    { day: "2026-03-27", count: 2 },
    { day: "2026-03-28", count: 1 },
  ],
  repliesPerDay: [
    { day: "2026-03-24", count: 4 },
    { day: "2026-03-25", count: 2 },
    { day: "2026-03-26", count: 5 },
    { day: "2026-03-27", count: 3 },
    { day: "2026-03-28", count: 2 },
  ],
  engagementByPost: [
    { postId: "demo-post-001", label: "Launch follow-up", likes: 226, reposts: 41, replies: 18 },
    { postId: "demo-post-002", label: "Operator recap", likes: 148, reposts: 21, replies: 11 },
  ],
  topPerformingPosts: [
    { postId: "demo-post-001", label: "Launch follow-up", score: 285 },
    { postId: "demo-post-002", label: "Operator recap", score: 180 },
  ],
  draftCategoryPerformance: [
    { category: "post", drafted: 8, posted: 5, failed: 1 },
    { category: "reply", drafted: 12, posted: 7, failed: 2 },
    { category: "quote", drafted: 5, posted: 3, failed: 1 },
    { category: "thread", drafted: 4, posted: 2, failed: 1 },
  ],
  followerSnapshots: [
    { day: "2026-03-24", followers: 11980 },
    { day: "2026-03-25", followers: 12045 },
    { day: "2026-03-26", followers: 12100 },
    { day: "2026-03-27", followers: 12210 },
    { day: "2026-03-28", followers: 12400 },
  ],
};

function groupDaily(logs: Array<{ timestamp: string }>) {
  const grouped = new Map<string, number>();
  for (const log of logs) {
    const day = log.timestamp.slice(0, 10);
    grouped.set(day, (grouped.get(day) || 0) + 1);
  }
  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, count]) => ({ day, count }));
}

export async function getAnalyticsSnapshot(): Promise<AnalyticsSnapshot> {
  const runtime = getConsoleRuntime();
  const logs = await getActionLogs();
  const drafts = await getDrafts();

  if (runtime.mode === "demo" && logs.length <= 3) {
    return {
      ...demoAnalytics,
      sourceLogs: logs,
    };
  }

  const posts = logs.filter((log: ActionLog) =>
    ["createPost", "createQuote"].includes(log.action_type),
  );
  const replies = logs.filter((log: ActionLog) => log.action_type === "createReply");

  const draftCategoryPerformance = ["post", "reply", "quote", "thread"].map((category) => {
    const matching = drafts.filter((draft) => draft.type === category);
    return {
      category,
      drafted: matching.length,
      posted: matching.filter((draft) => draft.status === "posted").length,
      failed: matching.filter((draft) => draft.status === "failed").length,
    };
  });

  return {
    postsPerDay: groupDaily(posts),
    repliesPerDay: groupDaily(replies),
    engagementByPost: [],
    topPerformingPosts: [],
    draftCategoryPerformance,
    followerSnapshots: [],
    sourceLogs: logs,
  };
}
