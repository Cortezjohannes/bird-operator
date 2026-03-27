import type { ActionLog } from "@/src/features/logs/types";

export interface AnalyticsSnapshot {
  postsPerDay: Array<{ day: string; count: number }>;
  repliesPerDay: Array<{ day: string; count: number }>;
  engagementByPost: Array<{
    postId: string;
    label: string;
    likes: number;
    reposts: number;
    replies: number;
  }>;
  topPerformingPosts: Array<{
    postId: string;
    label: string;
    score: number;
  }>;
  draftCategoryPerformance: Array<{
    category: string;
    drafted: number;
    posted: number;
    failed: number;
  }>;
  followerSnapshots: Array<{ day: string; followers: number }>;
  sourceLogs: ActionLog[];
}
