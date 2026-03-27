import "server-only";

import { getDetectedAuthMethods } from "@/src/features/x-auth/server/auth-config";
import type {
  AuthStatusPayload,
} from "@/src/features/x-auth/types";
import { getConsoleRuntime } from "@/src/features/console/server/runtime";

export { runCapabilityTests } from "@/src/features/x-client/server";

export function getAuthStatus(): AuthStatusPayload {
  const runtime = getConsoleRuntime();
  const detectedAuthMethods = getDetectedAuthMethods();

  return {
    mode: runtime.mode,
    requestedMode: runtime.requestedMode,
    isLiveReady: runtime.isLiveReady,
    hasPartialLiveConfig: runtime.hasPartialLiveConfig,
    detectedAuthMethods,
    liveProbeSummary:
      runtime.mode === "live"
        ? "Live capability probes are active and run server-side against X endpoints."
        : "Demo mode is active. Live mode requires complete local env configuration and will never expose secrets to the client.",
  };
}
