import { NextResponse } from "next/server";

import { updateOperatorSessionPolicy } from "@/src/features/operator-pairing/server/service";
import type { OperatorSessionPolicyInput } from "@/src/features/operator-pairing/types";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as Partial<OperatorSessionPolicyInput>;

  if (!body.mode) {
    return NextResponse.json(
      { error: { message: "mode is required." } },
      { status: 400 },
    );
  }

  const result = await updateOperatorSessionPolicy(id, {
    mode: body.mode,
    grantedCapabilities: body.grantedCapabilities || [],
    approvalRequiredCapabilities: body.approvalRequiredCapabilities || [],
    expiresAt: body.expiresAt ?? null,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: { message: result.message } },
      { status: 400 },
    );
  }

  return NextResponse.json(result);
}
