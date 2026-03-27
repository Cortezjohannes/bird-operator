import { ApprovalsScreen } from "@/src/features/approvals/components/approvals-screen";
import { getApprovals } from "@/src/features/approvals/server/service";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const approvals = await getApprovals();
  return <ApprovalsScreen initialApprovals={approvals} />;
}
