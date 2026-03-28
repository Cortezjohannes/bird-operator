import { NextResponse } from "next/server";

import { listPendingPairingRequests } from "@/src/features/operator-pairing/server/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const requests = await listPendingPairingRequests();
  return NextResponse.json({ requests });
}
