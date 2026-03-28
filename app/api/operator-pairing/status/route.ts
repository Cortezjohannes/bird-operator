import { NextRequest, NextResponse } from "next/server";

import { consumePairingStatusAttempt } from "@/src/features/operator-pairing/server/public-rate-limit";
import { getPairingRequestStatusForOperator } from "@/src/features/operator-pairing/server/service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const remoteAddress = forwardedFor?.split(",")[0]?.trim() || "unknown";
  const limit = consumePairingStatusAttempt(remoteAddress);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: { message: `Too many status polls. Try again in ${limit.retryAfterSeconds}s.` } },
      { status: 429 },
    );
  }

  const requestId = request.nextUrl.searchParams.get("requestId");
  const pollToken = request.nextUrl.searchParams.get("pollToken");

  if (!requestId || !pollToken) {
    return NextResponse.json(
      { error: { message: "requestId and pollToken are required." } },
      { status: 400 },
    );
  }

  const result = await getPairingRequestStatusForOperator({
    requestId,
    pollToken,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: { message: result.message } },
      { status: 404 },
    );
  }

  return NextResponse.json(result);
}
