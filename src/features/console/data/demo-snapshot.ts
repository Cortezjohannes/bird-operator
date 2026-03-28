import type { ConsoleSnapshot } from "@/src/features/console/types";

export const demoSnapshot: Omit<
  ConsoleSnapshot,
  "mode" | "isLiveReady" | "environmentLabel"
> = {
  accountLabel: "console_demo",
  capabilities: [
    {
      key: "read",
      label: "Read timeline and mentions",
      state: "available",
      detail: "Demo feed seeded locally. Live path can be activated with server env vars.",
    },
    {
      key: "write",
      label: "Draft and publish posts",
      state: "partial",
      detail: "Demo compose, queue, and approvals are fully wired. Live posting stays conservative until local auth is complete.",
    },
    {
      key: "profile",
      label: "Edit profile surface",
      state: "partial",
      detail: "Profile surface revisions and approvals are working in demo mode with public-safe sample assets.",
    },
    {
      key: "approvals",
      label: "Sensitive action approvals",
      state: "available",
      detail: "Approval gating, review, and execution logging are all active in the operator flow.",
    },
  ],
  queue: [
    {
      id: "queue-1",
      title: "Reply to browser fallback question",
      type: "reply",
      status: "approval_required",
      dueLabel: "Needs review in 12m",
    },
    {
      id: "queue-2",
      title: "Thread draft: launch room recap",
      type: "post",
      status: "draft",
      dueLabel: "Drafted 34m ago",
    },
    {
      id: "queue-3",
      title: "Refresh profile bio and URL",
      type: "profile",
      status: "ready",
      dueLabel: "Ready when approved",
    },
    {
      id: "queue-4",
      title: "Follow high-signal operator account",
      type: "follow",
      status: "scheduled",
      dueLabel: "Scheduled for 15:30 UTC",
    },
  ],
  activity: [
    {
      id: "activity-1",
      actor: "Operator",
      action: "queued a reply",
      target: "@opsradar mention",
      occurredAt: "4 minutes ago",
      risk: "medium",
    },
    {
      id: "activity-2",
      actor: "Assistant",
      action: "prepared a three-post thread",
      target: "launch room recap",
      occurredAt: "19 minutes ago",
      risk: "low",
    },
    {
      id: "activity-3",
      actor: "Operator",
      action: "requested profile review",
      target: "bio, URL, and banner note",
      occurredAt: "48 minutes ago",
      risk: "medium",
    },
  ],
  watchlist: [
    {
      id: "watch-1",
      handle: "@signal_desk",
      name: "Signal Desk",
      note: "Track tone shifts, launch framing, and post timing.",
      lastSeen: "Posted 9m ago",
    },
    {
      id: "watch-2",
      handle: "@watchgrid",
      name: "Watchgrid",
      note: "Watch watchlist behavior and quote-reply opportunities.",
      lastSeen: "Reposted 22m ago",
    },
    {
      id: "watch-3",
      handle: "@ops_bridge",
      name: "Ops Bridge",
      note: "Useful for quote-reply opportunities and operator-language cues.",
      lastSeen: "Mention spike 1h ago",
    },
  ],
  profile: {
    displayName: "Console Demo",
    handle: "@console_demo",
    bio: "Mission-control workspace for deliberate X operations, approvals, and safe fallback planning.",
    location: "Remote Ops",
    url: "https://example.com/operator-console",
  },
  analytics: {
    followers: "12.5k",
    engagementRate: "5.1%",
    responseMedian: "14m",
    pendingApprovals: 3,
  },
  composerDraft: {
    title: "Draft Composer",
    body:
      "Draft a concise operator-reviewed post, reply, quote, or thread. In demo mode, the full workflow stays convincing without any live credentials.",
  },
};
