import { NextRequest, NextResponse } from "next/server";

import { setTweetTriageLabel } from "@/src/features/operator-store/server/store";
import type { TriageLabel } from "@/src/features/operator-store/types";

export const dynamic = "force-dynamic";

const allowedLabels = new Set<TriageLabel>([
  "reply_worthy",
  "quote_worthy",
  "ignored",
  "saved",
]);

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { tweetId?: string; label?: TriageLabel };

  if (!body.tweetId || !body.label || !allowedLabels.has(body.label)) {
    return NextResponse.json(
      { error: { message: "Invalid triage payload." } },
      { status: 400 },
    );
  }

  const record = await setTweetTriageLabel(body.tweetId, body.label);
  return NextResponse.json({ record });
}
