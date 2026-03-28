import { NextRequest, NextResponse } from "next/server";

import { createPairingRequest, sanitizePairingError } from "@/src/features/operator-pairing/server/service";
import { consumePairingRequestAttempt } from "@/src/features/operator-pairing/server/public-rate-limit";
import type { CreatePairingRequestInput } from "@/src/features/operator-pairing/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const forwardedFor = request.headers.get("x-forwarded-for");
    const remoteAddress = forwardedFor?.split(",")[0]?.trim() || "unknown";
    const limit = consumePairingRequestAttempt(remoteAddress);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: { message: `Too many pairing requests. Try again in ${limit.retryAfterSeconds}s.` } },
        { status: 429 },
      );
    }

    const body = (await request.json()) as Partial<CreatePairingRequestInput>;

    if (!body.operatorInstanceId || !body.operatorLabel) {
      return NextResponse.json(
        { error: { message: "operatorInstanceId and operatorLabel are required." } },
        { status: 400 },
      );
    }

    const result = await createPairingRequest({
      operatorInstanceId: body.operatorInstanceId,
      operatorLabel: body.operatorLabel,
      operatorFingerprint: body.operatorFingerprint || {},
      requestedCapabilities: body.requestedCapabilities || [],
      requestedScopeSummary: body.requestedScopeSummary,
    });

    return NextResponse.json({ pairing: result }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: { message: sanitizePairingError(error) } },
      { status: 500 },
    );
  }
}
