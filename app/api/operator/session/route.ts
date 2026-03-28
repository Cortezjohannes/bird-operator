import { NextRequest, NextResponse } from "next/server";

import { verifyOperatorSessionLease } from "@/src/features/operator-pairing/server/service";

export const dynamic = "force-dynamic";

function getLeaseToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }

  return request.headers.get("x-operator-lease-token")?.trim() || null;
}

export async function GET(request: NextRequest) {
  const leaseToken = getLeaseToken(request);
  if (!leaseToken) {
    return NextResponse.json(
      { error: { message: "Operator lease token is required." } },
      { status: 401 },
    );
  }

  const session = await verifyOperatorSessionLease(leaseToken);
  if (!session) {
    return NextResponse.json(
      { error: { message: "Operator session is invalid, revoked, or expired." } },
      { status: 401 },
    );
  }

  return NextResponse.json({ session });
}
