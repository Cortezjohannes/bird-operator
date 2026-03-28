import "server-only";

import { getConsoleRuntime } from "@/src/features/console/server/runtime";
import { getAuthSetupState } from "@/src/features/auth/server/config";
import { getPersistenceStatus } from "@/src/features/operator-store/server/store";
import {
  getCurrentConnectedXAccountSummary,
  getDetectedAuthMethodsForCurrentUser,
  getTokenHealthForCurrentUser,
} from "@/src/features/x-auth/server/connected-account";
import {
  getOAuthHostingState,
  validateCurrentConnectedAccount,
} from "@/src/features/x-auth/server/oauth-flow";
import type { AuthStatusPayload } from "@/src/features/x-auth/types";

export { runCapabilityTests } from "@/src/features/x-client/server";

export async function getAuthStatus(): Promise<AuthStatusPayload> {
  const runtime = await getConsoleRuntime();
  await validateCurrentConnectedAccount();
  const [detectedAuthMethods, connectedAccount, tokenHealth, persistence] = await Promise.all([
    getDetectedAuthMethodsForCurrentUser(),
    getCurrentConnectedXAccountSummary(),
    getTokenHealthForCurrentUser(),
    getPersistenceStatus(),
  ]);
  const hosting = getOAuthHostingState();
  const authSetup = getAuthSetupState();

  return {
    mode: runtime.mode,
    requestedMode: runtime.requestedMode,
    isLiveReady: runtime.isLiveReady,
    hasPartialLiveConfig: runtime.hasPartialLiveConfig,
    detectedAuthMethods,
    liveProbeSummary:
      runtime.mode === "live"
        ? "Live capability probes are active and run server-side against X endpoints for the connected account."
        : "Live capability probes are unavailable. Enable live mode and connect an X account to run real checks.",
    connectedAccount,
    oauthConfigured: hosting.configured && hosting.encryptionEnabled,
    callbackUrl: hosting.callbackUrl,
    tokenHealth,
    scopesSummary: tokenHealth?.scopes || [],
    configWarnings: [...authSetup.configWarnings, ...hosting.warnings],
    persistenceBackend: persistence.backend,
    persistenceHealthy: persistence.healthy,
    persistenceSummary: persistence.message,
  };
}
