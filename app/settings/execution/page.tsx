import { ExecutionSettingsScreen } from "@/src/features/execution/components/execution-settings-screen";
import { getExecutionSettingsSnapshot } from "@/src/features/execution/server/service";

export const dynamic = "force-dynamic";

export default async function ExecutionSettingsPage() {
  const settings = await getExecutionSettingsSnapshot();
  return <ExecutionSettingsScreen initialSettings={settings} />;
}
