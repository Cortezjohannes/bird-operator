import { NextResponse } from "next/server";

import { getCurrentConnectedXAccountSummary } from "@/src/features/x-auth/server/connected-account";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    account: await getCurrentConnectedXAccountSummary(),
  });
}
