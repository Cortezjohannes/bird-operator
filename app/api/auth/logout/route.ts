import { NextResponse } from "next/server";

import { clearAppSession } from "@/src/features/auth/server/current-session";
import { recordActionLog } from "@/src/features/logs/server/service";

export const dynamic = "force-dynamic";

export async function POST() {
  await clearAppSession();
  await recordActionLog({
    actor: "owner",
    actionType: "auth.logout",
    targetType: "system",
    payloadSummary: "Owner session cleared.",
    resultStatus: "success",
    resultExcerpt: "Owner signed out successfully.",
    authMethod: "system",
  });
  return NextResponse.json({ ok: true });
}
