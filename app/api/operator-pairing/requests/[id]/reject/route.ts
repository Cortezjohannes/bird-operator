import { NextResponse } from "next/server";

import { rejectPairingRequest } from "@/src/features/operator-pairing/server/service";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await rejectPairingRequest(id);

  if (!result.ok) {
    return NextResponse.json(
      { error: { message: result.message } },
      { status: 400 },
    );
  }

  return NextResponse.json(result);
}
