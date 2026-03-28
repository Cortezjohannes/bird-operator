import { OperatorsScreen } from "@/src/features/operator-pairing/components/operators-screen";
import {
  listActiveOperatorSessions,
  listPendingPairingRequests,
} from "@/src/features/operator-pairing/server/service";
import { getCurrentConnectedXAccountSummary } from "@/src/features/x-auth/server/connected-account";

export const dynamic = "force-dynamic";

export default async function OperatorsPage() {
  const [requests, sessions, connectedAccount] = await Promise.all([
    listPendingPairingRequests(),
    listActiveOperatorSessions(),
    getCurrentConnectedXAccountSummary(),
  ]);

  return (
    <OperatorsScreen
      initialRequests={requests}
      initialSessions={sessions}
      connectedAccountLabel={connectedAccount ? `@${connectedAccount.username}` : null}
    />
  );
}
