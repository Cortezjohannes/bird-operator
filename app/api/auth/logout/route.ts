import { NextRequest, NextResponse } from "next/server";

import { clearAppSession } from "@/src/features/auth/server/current-session";
import { isTrustedOrigin } from "@/src/features/auth/server/config";
import { recordActionLog } from "@/src/features/logs/server/service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin && !isTrustedOrigin(origin)) {
    return NextResponse.json(
      { error: { message: "Blocked by same-origin policy." } },
      { status: 403 },
    );
  }

  await clearAppSession();
  await recordActionLog({
    actor: "owner",
    actorType: "owner",
    actionType: "auth.logout",
    targetType: "system",
    payloadSummary: "Owner session cleared.",
    resultStatus: "success",
    resultExcerpt: "Owner signed out successfully.",
    authMethod: "system",
  });
  return NextResponse.json({ ok: true });
}
