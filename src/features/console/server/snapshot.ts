import "server-only";

import { demoSnapshot } from "@/src/features/console/data/demo-snapshot";
import { getConsoleRuntime } from "@/src/features/console/server/runtime";
import type { ConsoleSnapshot } from "@/src/features/console/types";

export function getConsoleSnapshot(): ConsoleSnapshot {
  const runtime = getConsoleRuntime();

  if (runtime.mode === "live") {
    return {
      ...demoSnapshot,
      mode: "live",
      isLiveReady: true,
      environmentLabel: "Live mode",
      accountLabel: process.env.X_OPERATOR_ACCOUNT_LABEL || "live_account",
      capabilities: demoSnapshot.capabilities.map((capability) => ({
        ...capability,
        detail:
          capability.key === "write"
            ? "Live credentials detected. Real execution plumbing is reserved for a follow-up phase."
            : capability.detail,
      })),
    };
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
