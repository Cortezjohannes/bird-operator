import "server-only";

import { demoSnapshot } from "@/src/features/console/data/demo-snapshot";
import { getConsoleRuntime } from "@/src/features/console/server/runtime";
import type {
  ActivityItem,
  AnalyticsSnapshot as DashboardAnalyticsSnapshot,
  CapabilityDiagnostic,
  CapabilityState,
  ConsoleSnapshot,
  QueueItem,
  WatchlistItem,
} from "@/src/features/console/types";
import { getDrafts } from "@/src/features/drafts/server/service";
import { getFeedTweets, getMentionTweets } from "@/src/features/feed/server/feed-service";
import { getAnalyticsSnapshot } from "@/src/features/analytics/server/service";
import { getActionLogs } from "@/src/features/logs/server/service";
import { readOperatorStore, listApprovals } from "@/src/features/operator-store/server/store";
import { getProfileEditorState } from "@/src/features/profile/server/service";
import { getAuthStatus, runCapabilityTests } from "@/src/features/x-auth/server/capability-tests";
import type { ConsoleSnapshot as ConsoleSnapshotType } from "@/src/features/console/types";

function relativeTime(value: string | null | undefined) {
  if (!value) {
    return "just now";
  }

  const deltaMs = new Date(value).getTime() - Date.now();
  if (!Number.isFinite(deltaMs)) {
    return value;
  }

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(deltaMs) < hour) {
    return rtf.format(Math.round(deltaMs / minute), "minute");
  }
  if (Math.abs(deltaMs) < day) {
    return rtf.format(Math.round(deltaMs / hour), "hour");
  }
  return rtf.format(Math.round(deltaMs / day), "day");
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact" }).format(value);
}

function getCapabilityState(available: number, total: number): CapabilityState {
  if (available <= 0) {
    return "blocked";
  }
  if (available < total) {
    return "partial";
  }
  return "available";
}

function summarizeCapabilityErrors(errors: Array<string | null>) {
  return errors.find(Boolean) || "Capability tests completed successfully.";
}

function buildCapabilityDiagnostics(input: {
  results: Awaited<ReturnType<typeof runCapabilityTests>>;
  authWarnings: string[];
}): CapabilityDiagnostic[] {
  const lookup = new Map(input.results.map((result) => [result.capability, result]));
  const readCapabilities = ["read_timeline", "read_mentions"] as const;
  const writeCapabilities = [
    "post_tweet",
    "reply_tweet",
    "quote_tweet",
    "like_tweet",
    "repost_tweet",
    "bookmark_tweet",
    "follow_user",
    "unfollow_user",
  ] as const;
  const profileCapabilities = ["update_profile_text", "update_profile_media"] as const;

  const groups = [
    {
      key: "read",
      label: "Read timeline and mentions",
      capabilities: readCapabilities,
    },
    {
      key: "write",
      label: "Post, reply, quote, and engagement actions",
      capabilities: writeCapabilities,
    },
    {
      key: "profile",
      label: "Edit profile surface",
      capabilities: profileCapabilities,
    },
  ] as const;

  const diagnostics: CapabilityDiagnostic[] = groups.map((group) => {
    const relevant = group.capabilities.map((capability) => lookup.get(capability)).filter(Boolean);
    const available = relevant.filter((result) => result?.supported).length;
    const state = getCapabilityState(available, group.capabilities.length);
    const latestTest = relevant
      .map((result) => result?.testedAt || "")
      .filter(Boolean)
      .sort()
      .at(-1);
    const latestMethod = relevant.find((result) => result?.authMethodUsed && result.authMethodUsed !== "none");

    return {
      key: group.key,
      label: group.label,
      state,
      detail:
        state === "available"
          ? `${available}/${group.capabilities.length} live checks passed or were conclusively supported. Last tested ${relativeTime(latestTest)} via ${latestMethod?.authMethodUsed || "live auth"}.`
          : `${available}/${group.capabilities.length} checks are currently available. ${summarizeCapabilityErrors(
              relevant.map((result) => result?.error || null),
            )}`,
    };
  });

  diagnostics.push({
    key: "approvals",
    label: "Sensitive action approvals",
    state: input.authWarnings.length > 0 ? "partial" : "available",
    detail:
      input.authWarnings.length > 0
        ? input.authWarnings[0]
        : "Approval routing, operator session controls, and audit logging are active for this account.",
  });

  return diagnostics;
}

function buildQueueItems(input: {
  drafts: Awaited<ReturnType<typeof getDrafts>>;
  approvals: Awaited<ReturnType<typeof listApprovals>>;
}): QueueItem[] {
  const draftItems: QueueItem[] = input.drafts.slice(0, 4).map((draft) => ({
    id: draft.id,
    title: draft.text.slice(0, 72) || `${draft.type} draft`,
    type:
      draft.type === "reply"
        ? "reply"
        : draft.type === "quote" || draft.type === "thread"
          ? "post"
          : draft.type === "post"
            ? "post"
            : "post",
    status:
      draft.status === "pending_approval"
        ? "approval_required"
        : draft.status === "scheduled"
          ? "scheduled"
          : draft.status === "posted"
            ? "ready"
            : "draft",
    dueLabel: draft.scheduled_for
      ? `Scheduled ${relativeTime(draft.scheduled_for)}`
      : `Updated ${relativeTime(draft.updated_at)}`,
  }));

  const approvalItems: QueueItem[] = input.approvals
    .filter((approval) => approval.status === "pending")
    .slice(0, 3)
    .map((approval) => ({
      id: approval.id,
      title: approval.reason,
      type:
        approval.action_type === "reply_tweet"
          ? "reply"
          : approval.action_type === "follow_user"
            ? "follow"
            : approval.action_type === "profile_edit"
              ? "profile"
              : "post",
      status: "approval_required",
      dueLabel: `Requested ${relativeTime(approval.created_at)}`,
    }));

  return [...approvalItems, ...draftItems]
    .sort((a, b) => a.dueLabel.localeCompare(b.dueLabel))
    .slice(0, 6);
}

function buildActivityItems(
  logs: Awaited<ReturnType<typeof getActionLogs>>,
): ActivityItem[] {
  return logs.slice(0, 6).map((log) => ({
    id: log.id,
    actor: log.actor_type === "owner" ? "Owner" : log.actor_type === "operator" ? "Operator" : "System",
    action: log.action_type,
    target: log.target_id || log.target_type,
    occurredAt: relativeTime(log.timestamp),
    risk:
      log.result_status === "failed"
        ? "high"
        : log.execution_path === "approval_gated" || log.operator_session_mode === "trusted_operator"
          ? "medium"
          : "low",
  }));
}

function buildWatchlistItems(input: {
  watchlist: Awaited<ReturnType<typeof readOperatorStore>>["watchlist"];
  feedAuthors: Map<string, string>;
}): WatchlistItem[] {
  return Object.values(input.watchlist)
    .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
    .slice(0, 6)
    .map((entry) => ({
      id: entry.userHandle,
      handle: entry.userHandle,
      name: entry.userName,
      note: "Tracked account in live operator watchlist.",
      lastSeen: input.feedAuthors.get(entry.userHandle) || `Added ${relativeTime(entry.addedAt)}`,
    }));
}

function buildAnalyticsCardSnapshot(input: {
  analytics: Awaited<ReturnType<typeof getAnalyticsSnapshot>>;
  pendingApprovals: number;
}): DashboardAnalyticsSnapshot {
  const latestFollowers = input.analytics.followerSnapshots.at(-1)?.followers;
  const repliesToday = input.analytics.repliesPerDay.at(-1)?.count || 0;
  const totalEngagement =
    input.analytics.engagementByPost.reduce((sum, post) => {
      return sum + post.likes + post.reposts + post.replies;
    }, 0) || 0;
  const totalPosts = input.analytics.engagementByPost.length || 0;
  const averageEngagement = totalPosts > 0 ? Math.round(totalEngagement / totalPosts) : 0;

  return {
    followers: latestFollowers ? formatCount(latestFollowers) : "n/a",
    engagementRate: averageEngagement > 0 ? `${averageEngagement}/post` : "n/a",
    responseMedian: `${repliesToday} replies today`,
    pendingApprovals: input.pendingApprovals,
  };
}

async function buildLiveSnapshot(): Promise<ConsoleSnapshotType> {
  const [authStatus, capabilityResults, feedResult, mentionsResult, drafts, approvals, store, logs, analytics, profileState] =
    await Promise.all([
      getAuthStatus(),
      runCapabilityTests(),
      getFeedTweets(),
      getMentionTweets(),
      getDrafts(),
      listApprovals(),
      readOperatorStore(),
      getActionLogs(),
      getAnalyticsSnapshot(),
      getProfileEditorState(),
    ]);

  const connectedAccount = authStatus.connectedAccount;
  const accountLabel = connectedAccount ? `@${connectedAccount.username}` : "connected_account";
  const feedAuthors = new Map<string, string>();
  if (feedResult.ok) {
    for (const tweet of feedResult.data) {
      feedAuthors.set(tweet.authorHandle, `Seen ${relativeTime(tweet.createdAt)}`);
    }
  }
  if (mentionsResult.ok) {
    for (const tweet of mentionsResult.data) {
      feedAuthors.set(tweet.authorHandle, `Mentioned ${relativeTime(tweet.createdAt)}`);
    }
  }

  const pendingApprovals = approvals.filter((approval) => approval.status === "pending").length;
  const latestDraft = drafts[0];
  const liveCapabilities = buildCapabilityDiagnostics({
    results: capabilityResults,
    authWarnings: authStatus.configWarnings,
  });

  return {
    mode: "live",
    isLiveReady: true,
    environmentLabel: connectedAccount ? `Live · ${accountLabel}` : "Live mode",
    accountLabel,
    capabilities: liveCapabilities,
    queue: buildQueueItems({ drafts, approvals }),
    activity: buildActivityItems(logs),
    watchlist: buildWatchlistItems({
      watchlist: store.watchlist,
      feedAuthors,
    }),
    profile: {
      displayName:
        profileState.applied?.name ||
        profileState.draft?.name ||
        connectedAccount?.displayName ||
        "Connected account",
      handle: connectedAccount ? `@${connectedAccount.username}` : "@unknown",
      bio: profileState.applied?.bio || profileState.draft?.bio || "No live bio cached yet.",
      location: profileState.applied?.location || profileState.draft?.location || "Not set",
      url: profileState.applied?.url || profileState.draft?.url || "Not set",
    },
    analytics: buildAnalyticsCardSnapshot({
      analytics,
      pendingApprovals,
    }),
    composerDraft: {
      title: latestDraft
        ? `${latestDraft.type[0].toUpperCase()}${latestDraft.type.slice(1)} draft`
        : `Compose for ${accountLabel}`,
      body:
        latestDraft?.text ||
        `Live account connected as ${accountLabel}. Start from Compose, Feed, or Mentions to draft directly against this account.`,
    },
  };
}

export async function getConsoleSnapshot(): Promise<ConsoleSnapshot> {
  const runtime = await getConsoleRuntime();

  if (runtime.mode === "live") {
    return buildLiveSnapshot();
  }

  const environmentLabel = runtime.hasPartialLiveConfig
    ? "Demo mode (live config incomplete)"
    : "Demo mode";

  return {
    ...demoSnapshot,
    mode: "demo",
    isLiveReady: runtime.isLiveReady,
    environmentLabel,
  };
}
