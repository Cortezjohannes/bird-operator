import { NextResponse } from "next/server";

import { getActionLogs } from "@/src/features/logs/server/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const logs = await getActionLogs();
  return NextResponse.json({ logs });
}
