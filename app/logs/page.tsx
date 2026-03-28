import { LogsScreen } from "@/src/features/logs/components/logs-screen";
import { getActionLogs } from "@/src/features/logs/server/service";

export const dynamic = "force-dynamic";

export default async function LogsPage() {
  const logs = await getActionLogs();
  return <LogsScreen initialLogs={logs} />;
}
