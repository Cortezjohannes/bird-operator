import {
  createApiUrl,
  formatTimestamp,
  loadOperatorConfig,
  parseJsonResponse,
  printHeader,
  printKeyValue,
  readStoredOperatorSession,
  writeStoredOperatorSession,
} from "./operator-common.mjs";

async function fetchRemoteSession(baseUrl, leaseToken) {
  const response = await fetch(createApiUrl(baseUrl, "/api/operator/session"), {
    method: "GET",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${leaseToken}`,
    },
  });

  return parseJsonResponse(response);
}

async function main() {
  const config = loadOperatorConfig();
  const stored = readStoredOperatorSession(config.sessionPath);

  printHeader("Bird Operator Session Status");
  printKeyValue("App", config.appBaseUrl);
  printKeyValue("Operator label", config.operatorLabel);
  printKeyValue("Operator instance", config.operatorInstanceId);
  printKeyValue("Session file", config.sessionPath);

  if (!stored) {
    process.stdout.write(
      "\nNot paired locally. Run `npm run operator:pair` after configuring .env.operator.\n",
    );
    return;
  }

  printKeyValue("Stored request ID", stored.requestId || "n/a");
  printKeyValue("Stored session ID", stored.session?.id || "n/a");
  printKeyValue("Stored mode", stored.session?.mode || "n/a");
  printKeyValue("Stored expires at", formatTimestamp(stored.session?.expiresAt));
  printKeyValue("Stored last seen", formatTimestamp(stored.session?.lastSeenAt));

  try {
    const data = await fetchRemoteSession(config.appBaseUrl, stored.leaseToken);
    const remote = data.session;

    const refreshed = {
      ...stored,
      appBaseUrl: config.appBaseUrl,
      operatorLabel: config.operatorLabel,
      operatorInstanceId: config.operatorInstanceId,
      session: {
        id: remote.id,
        status: remote.status,
        mode: remote.mode,
        pairedAt: remote.pairedAt,
        expiresAt: remote.expiresAt,
        revokedAt: remote.revokedAt,
        lastSeenAt: remote.lastSeenAt,
        grantedCapabilities: remote.grantedCapabilities,
        approvalRequiredCapabilities: remote.approvalRequiredCapabilities,
        connectedXAccountId: remote.connectedXAccountId,
      },
      savedAt: new Date().toISOString(),
    };
    writeStoredOperatorSession(refreshed, config.sessionPath);

    printHeader("Remote Session");
    printKeyValue("Status", remote.status);
    printKeyValue("Mode", remote.mode);
    printKeyValue("Paired at", formatTimestamp(remote.pairedAt));
    printKeyValue("Expires at", formatTimestamp(remote.expiresAt));
    printKeyValue("Last seen", formatTimestamp(remote.lastSeenAt));
    printKeyValue(
      "Granted capabilities",
      remote.grantedCapabilities.join(", ") || "none",
    );
    printKeyValue(
      "Approval-required capabilities",
      remote.approvalRequiredCapabilities.join(", ") || "none",
    );
  } catch (error) {
    printHeader("Remote Session");
    process.stdout.write(`Unable to verify the stored lease with the app: ${error.message}\n`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  process.stderr.write(`\nStatus check failed: ${error.message}\n`);
  process.exitCode = 1;
});
