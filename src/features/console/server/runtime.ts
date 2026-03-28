import "server-only";

import type { ConsoleMode } from "@/src/features/console/types";
import { getDetectedAuthMethodsForCurrentUser } from "@/src/features/x-auth/server/connected-account";

export async function getConsoleRuntime() {
  const detectedAuthMethods = await getDetectedAuthMethodsForCurrentUser();
  const requestedMode: ConsoleMode =
    process.env.X_OPERATOR_CONSOLE_MODE === "live" ? "live" : "demo";
  const configuredLiveMethods = detectedAuthMethods.filter(
    (method) => method.configured && method.canBeUsedForLiveTests,
  );
  const isLiveReady = configuredLiveMethods.length > 0;
  const mode: ConsoleMode =
    requestedMode === "live" && isLiveReady ? "live" : "demo";

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
