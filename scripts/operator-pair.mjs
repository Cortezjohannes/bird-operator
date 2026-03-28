import {
  createApiUrl,
  formatTimestamp,
  loadOperatorConfig,
  parseJsonResponse,
  printHeader,
  printKeyValue,
  sleep,
  toStoredSession,
  writeStoredOperatorSession,
} from "./operator-common.mjs";

async function requestPairing(config) {
  const response = await fetch(
    createApiUrl(config.appBaseUrl, "/api/operator-pairing/request"),
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        operatorInstanceId: config.operatorInstanceId,
        operatorLabel: config.operatorLabel,
        operatorFingerprint: config.operatorFingerprint,
        requestedCapabilities: config.requestedCapabilities,
        requestedScopeSummary: config.requestedScopeSummary || undefined,
      }),
    },
  );

  const data = await parseJsonResponse(response);
  return data.pairing;
}

async function pollStatus(config, pairing) {
  const expiresAt = new Date(pairing.expiresAt).getTime();

  while (Date.now() < expiresAt) {
    const response = await fetch(
      createApiUrl(config.appBaseUrl, "/api/operator-pairing/status", {
        requestId: pairing.requestId,
        pollToken: pairing.pollToken,
      }),
      {
        method: "GET",
        headers: {
          accept: "application/json",
        },
      },
    );

    const data = await parseJsonResponse(response);
    const requestStatus = data.request?.status;

    if (data.leaseToken && data.session) {
      return {
        request: data.request,
        session: data.session,
        leaseToken: data.leaseToken,
      };
    }

    if (requestStatus === "rejected") {
      throw new Error("Pairing request was rejected by the owner.");
    }

    if (requestStatus === "revoked") {
      throw new Error("Pairing request was revoked before activation.");
    }

    if (requestStatus === "expired") {
      throw new Error("Pairing request expired before approval.");
    }

    if (requestStatus === "approved" && !data.leaseToken) {
      throw new Error(
        "Pairing request was approved, but the one-time lease was already claimed elsewhere.",
      );
    }

    process.stdout.write(".");
    await sleep(5000);
  }

  throw new Error("Pairing request expired before approval.");
}

async function main() {
  const config = loadOperatorConfig();

  printHeader("Bird Operator Pairing");
  printKeyValue("App", config.appBaseUrl);
  printKeyValue("Operator label", config.operatorLabel);
  printKeyValue("Operator instance", config.operatorInstanceId);
  printKeyValue("Operator env", config.envPath);
  printKeyValue("Session file", config.sessionPath);

  const pairing = await requestPairing(config);

  printHeader("Approval Required");
  printKeyValue("Approval URL", pairing.approvalUrl);
  printKeyValue("Backup code", pairing.oneTimeCode);
  printKeyValue("Request ID", pairing.requestId);
  printKeyValue("Expires at", formatTimestamp(pairing.expiresAt));
  printKeyValue("Requested capabilities", config.requestedCapabilities.join(", "));
  process.stdout.write(
    "\nOpen the approval URL while signed into Bird Operator, or approve with the backup code in the web UI.\n",
  );

  process.stdout.write("\nWaiting for approval");
  const approved = await pollStatus(config, pairing);
  process.stdout.write("\n");

  const stored = toStoredSession({
    appBaseUrl: config.appBaseUrl,
    operatorLabel: config.operatorLabel,
    operatorInstanceId: config.operatorInstanceId,
    requestId: pairing.requestId,
    leaseToken: approved.leaseToken,
    session: approved.session,
  });
  writeStoredOperatorSession(stored, config.sessionPath);

  printHeader("Paired");
  printKeyValue("Session ID", approved.session.id);
  printKeyValue("Mode", approved.session.mode);
  printKeyValue("Status", approved.session.status);
  printKeyValue("Paired at", formatTimestamp(approved.session.pairedAt));
  printKeyValue("Expires at", formatTimestamp(approved.session.expiresAt));
  printKeyValue("Last seen", formatTimestamp(approved.session.lastSeenAt));
  printKeyValue("Granted capabilities", approved.session.grantedCapabilities.join(", ") || "none");
  printKeyValue("Session file", config.sessionPath);
  process.stdout.write(
    "\nStored the app-level operator lease locally. No X credentials were copied to this machine.\n",
  );
}

main().catch((error) => {
  process.stderr.write(`\nPairing failed: ${error.message}\n`);
  process.exitCode = 1;
});
