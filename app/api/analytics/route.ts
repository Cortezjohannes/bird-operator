import { NextResponse } from "next/server";

import { getAnalyticsSnapshot } from "@/src/features/analytics/server/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await getAnalyticsSnapshot();
  return NextResponse.json({ snapshot });
}
