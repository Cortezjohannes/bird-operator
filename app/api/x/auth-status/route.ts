import { NextResponse } from "next/server";

import { getAuthStatus } from "@/src/features/x-auth/server/capability-tests";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getAuthStatus());
}
