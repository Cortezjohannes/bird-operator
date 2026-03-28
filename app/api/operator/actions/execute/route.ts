import { NextRequest, NextResponse } from "next/server";

import { consumeOperatorActionAttempt } from "@/src/features/operator-pairing/server/public-rate-limit";
import { executeOperatorSessionAction } from "@/src/features/operator-pairing/server/service";
import type { ExecutionActionType, ExecutionPayloadMap } from "@/src/features/execution/types";

export const dynamic = "force-dynamic";

function getLeaseToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }

  return request.headers.get("x-operator-lease-token")?.trim() || null;
}

export async function POST(request: NextRequest) {
  const leaseToken = getLeaseToken(request);
  if (!leaseToken) {
    return NextResponse.json(
      { error: { message: "Operator lease token is required." } },
      { status: 401 },
    );
  }

  const limit = consumeOperatorActionAttempt(leaseToken);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: { message: `Too many operator actions. Try again in ${limit.retryAfterSeconds}s.` } },
      { status: 429 },
    );
  }

  const body = (await request.json()) as {
    action?: ExecutionActionType;
    payload?: ExecutionPayloadMap[ExecutionActionType];
  };

  if (!body.action) {
    return NextResponse.json(
      { error: { message: "action is required." } },
      { status: 400 },
    );
  }

  const result = await executeOperatorSessionAction({
    leaseToken,
    action: body.action,
    payload: body.payload as ExecutionPayloadMap[ExecutionActionType],
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: { message: result.message, details: "error" in result ? result.error : null } },
      { status: result.status },
    );
  }

  return NextResponse.json(result, { status: result.status });
}
