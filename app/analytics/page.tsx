import { AnalyticsScreen } from "@/src/features/analytics/components/analytics-screen";
import { getAnalyticsSnapshot } from "@/src/features/analytics/server/service";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const snapshot = await getAnalyticsSnapshot();
  return <AnalyticsScreen snapshot={snapshot} />;
}
