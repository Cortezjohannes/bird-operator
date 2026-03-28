import { NextRequest, NextResponse } from "next/server";

import { createPairingRequest, sanitizePairingError } from "@/src/features/operator-pairing/server/service";
import type { CreatePairingRequestInput } from "@/src/features/operator-pairing/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
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
