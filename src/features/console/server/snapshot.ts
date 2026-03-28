import "server-only";

import { demoSnapshot } from "@/src/features/console/data/demo-snapshot";
import { getConsoleRuntime } from "@/src/features/console/server/runtime";
import type { ConsoleSnapshot } from "@/src/features/console/types";

export async function getConsoleSnapshot(): Promise<ConsoleSnapshot> {
  const runtime = await getConsoleRuntime();

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
            ? "Live account connectivity is enabled. Execution still flows through capability truth checks, approvals, and server-side controls."
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
