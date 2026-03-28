import { PairingApprovalScreen } from "@/src/features/operator-pairing/components/pairing-approval-screen";
import { getPairingApprovalPageState } from "@/src/features/operator-pairing/server/service";
import { getCurrentConnectedXAccountSummary } from "@/src/features/x-auth/server/connected-account";

export const dynamic = "force-dynamic";

export default async function OperatorApprovalPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const [request, connectedAccount] = await Promise.all([
    token ? getPairingApprovalPageState(token) : Promise.resolve(null),
    getCurrentConnectedXAccountSummary(),
  ]);

  return (
    <PairingApprovalScreen
      request={request}
      connectedAccountLabel={connectedAccount ? `@${connectedAccount.username}` : null}
    />
  );
}
