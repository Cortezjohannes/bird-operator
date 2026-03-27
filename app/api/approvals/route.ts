import { NextResponse } from "next/server";

import { getApprovals } from "@/src/features/approvals/server/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const approvals = await getApprovals();
  return NextResponse.json({ approvals });
}
