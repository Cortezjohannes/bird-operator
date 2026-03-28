import { NextResponse } from "next/server";

import { runCapabilityTests } from "@/src/features/x-auth/server/capability-tests";

export const dynamic = "force-dynamic";

export async function GET() {
  const results = await runCapabilityTests();
  return NextResponse.json({ results });
}
