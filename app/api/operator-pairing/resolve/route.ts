import { NextRequest, NextResponse } from "next/server";

import { resolvePairingRequest } from "@/src/features/operator-pairing/server/service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { token?: string; code?: string };
  const resolution = await resolvePairingRequest({
    token: body.token || null,
    code: body.code || null,
  });

  if (!resolution.request) {
    return NextResponse.json(
      { error: { message: "No pending pairing request matched the provided token or code." } },
      { status: 404 },
    );
  }

  return NextResponse.json(resolution);
}
