import { NextResponse } from "next/server";

import { recordActionLog } from "@/src/features/logs/server/service";
import { disconnectCurrentXAccount } from "@/src/features/x-auth/server/connected-account";

export const dynamic = "force-dynamic";

export async function POST() {
  const disconnected = await disconnectCurrentXAccount();

  await recordActionLog({
    actor: "owner-user",
    actionType: "x.disconnect",
    targetType: "user",
    targetId: disconnected?.xUserId || null,
    payloadSummary: "Disconnected X account from app user.",
    resultStatus: disconnected ? "success" : "skipped",
    resultExcerpt: disconnected
      ? "Connected X account removed."
      : "No connected X account was present.",
    authMethod: "system",
  });

  return NextResponse.json({ disconnected: Boolean(disconnected) });
}
