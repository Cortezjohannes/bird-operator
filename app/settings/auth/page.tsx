import { unstable_noStore as noStore } from "next/cache";

import { AuthPage } from "@/src/features/x-auth/components/auth-page";
import {
  getAuthStatus,
  runCapabilityTests,
} from "@/src/features/x-auth/server/capability-tests";

export const dynamic = "force-dynamic";

export default async function SettingsAuthPage() {
  noStore();

  const [authStatus, capabilityResults] = await Promise.all([
    Promise.resolve(getAuthStatus()),
    runCapabilityTests(),
  ]);

  return <AuthPage authStatus={authStatus} capabilityResults={capabilityResults} />;
}
