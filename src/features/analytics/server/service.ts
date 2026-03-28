import "server-only";

import { getDrafts } from "@/src/features/drafts/server/service";
import { getActionLogs } from "@/src/features/logs/server/service";
import type { AnalyticsSnapshot } from "@/src/features/analytics/types";
import type { ActionLog } from "@/src/features/logs/types";

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
  const logs = await getActionLogs();
  const drafts = await getDrafts();

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
