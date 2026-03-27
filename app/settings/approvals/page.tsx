import { ApprovalSettingsScreen } from "@/src/features/approvals/components/approval-settings-screen";
import { getApprovalPolicy } from "@/src/features/approvals/server/service";

export const dynamic = "force-dynamic";

export default async function ApprovalSettingsPage() {
  const settings = await getApprovalPolicy();
  return <ApprovalSettingsScreen initialSettings={settings} />;
}
