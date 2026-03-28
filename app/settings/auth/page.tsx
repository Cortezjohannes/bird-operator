import { unstable_noStore as noStore } from "next/cache";

import { AuthPage } from "@/src/features/x-auth/components/auth-page";
import {
  getAuthStatus,
  runCapabilityTests,
} from "@/src/features/x-auth/server/capability-tests";

export const dynamic = "force-dynamic";

export default async function SettingsAuthPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; connected?: string }>;
}) {
  noStore();
  const resolvedSearchParams = await searchParams;

  const [authStatus, capabilityResults] = await Promise.all([
    getAuthStatus(),
    runCapabilityTests(),
  ]);

  return (
    <AuthPage
      authStatus={authStatus}
      capabilityResults={capabilityResults}
      statusMessage={resolvedSearchParams.connected
        ? `Connected @${resolvedSearchParams.connected}.`
        : null}
      errorMessage={resolvedSearchParams.error || null}
    />
  );
}
