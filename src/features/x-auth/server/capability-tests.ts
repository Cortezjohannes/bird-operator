import "server-only";

import { getConsoleRuntime } from "@/src/features/console/server/runtime";
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
  const [detectedAuthMethods, connectedAccount, tokenHealth] = await Promise.all([
    getDetectedAuthMethodsForCurrentUser(),
    getCurrentConnectedXAccountSummary(),
    getTokenHealthForCurrentUser(),
  ]);
  const hosting = getOAuthHostingState();

  return {
    mode: runtime.mode,
    requestedMode: runtime.requestedMode,
    isLiveReady: runtime.isLiveReady,
    hasPartialLiveConfig: runtime.hasPartialLiveConfig,
    detectedAuthMethods,
    liveProbeSummary:
      runtime.mode === "live"
        ? "Live capability probes are active and run server-side against X endpoints for the connected account."
        : "Demo mode is active. Switch the runtime to live and connect an X account to run real capability probes.",
    connectedAccount,
    oauthConfigured: hosting.configured && hosting.encryptionEnabled,
    callbackUrl: hosting.callbackUrl,
    tokenHealth,
    scopesSummary: tokenHealth?.scopes || [],
  };
}
