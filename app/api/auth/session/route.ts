import { NextResponse } from "next/server";

import { getCurrentSession } from "@/src/features/auth/server/current-session";
import { getAuthSetupState } from "@/src/features/auth/server/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCurrentSession();
  return NextResponse.json({
    session,
    setup: getAuthSetupState(),
  });
}
