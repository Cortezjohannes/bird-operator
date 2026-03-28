import { NextResponse } from "next/server";

import { listActiveOperatorSessions } from "@/src/features/operator-pairing/server/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const sessions = await listActiveOperatorSessions();
  return NextResponse.json({ sessions });
}
