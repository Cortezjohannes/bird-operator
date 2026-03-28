import "server-only";

import type { ConsoleMode } from "@/src/features/console/types";
import { getDetectedAuthMethods } from "@/src/features/x-auth/server/connected-account";

export async function getConsoleRuntime(input?: {
  appUserId?: string | null;
  expectedXUserId?: string | null;
}) {
  const detectedAuthMethods = await getDetectedAuthMethods(input);
  const requestedMode: ConsoleMode =
    process.env.X_OPERATOR_CONSOLE_MODE === "live" ? "live" : "unavailable";
  const configuredLiveMethods = detectedAuthMethods.filter(
    (method) => method.configured && method.canBeUsedForLiveTests,
  );
  const isLiveReady = configuredLiveMethods.length > 0;
  const mode: ConsoleMode =
    requestedMode === "live" && isLiveReady ? "live" : "unavailable";

  return {
    mode,
    requestedMode,
    isLiveReady,
    hasPartialLiveConfig:
      detectedAuthMethods.some((method) => method.detectedFields > 0) &&
      !isLiveReady,
    configuredLiveMethods: configuredLiveMethods.map((method) => method.key),
  };
}
