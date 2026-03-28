import { NextResponse } from "next/server";

import { runCapabilityTests } from "@/src/features/x-auth/server/capability-tests";

export const dynamic = "force-dynamic";

export async function POST() {
  const results = await runCapabilityTests({ force: true });
  return NextResponse.json({ results });
}
