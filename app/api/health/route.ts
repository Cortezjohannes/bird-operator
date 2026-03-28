import { NextResponse } from "next/server";

import { getAuthSetupState, getAppBaseUrl } from "@/src/features/auth/server/config";
import { getPersistenceStatus } from "@/src/features/operator-store/server/store";
import { getOAuthHostingState } from "@/src/features/x-auth/server/oauth-flow";

export const dynamic = "force-dynamic";

export async function GET() {
  const [persistence] = await Promise.all([getPersistenceStatus()]);
  const auth = getAuthSetupState();
  const oauth = getOAuthHostingState();

  const healthy = persistence.healthy && auth.configured && Boolean(getAppBaseUrl());

  return NextResponse.json(
    {
      ok: healthy,
      appUrl: getAppBaseUrl() || null,
      persistence,
      auth,
      oauth,
    },
    { status: healthy ? 200 : 503 },
  );
}
