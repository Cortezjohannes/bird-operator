import { NextRequest, NextResponse } from "next/server";

import {
  executeAction,
  logExecutionOutcome,
} from "@/src/features/execution/server/service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { tweetId?: string };
  if (!body.tweetId) {
    return NextResponse.json({ error: { message: "Missing tweetId." } }, { status: 400 });
  }

  const result = await executeAction("repostTweet", { tweetId: body.tweetId });
  await logExecutionOutcome({
    actor: "operator",
    actionType: "repostTweet",
    targetType: "tweet",
    targetId: body.tweetId,
    payloadSummary: `Repost tweet ${body.tweetId}`,
    result,
    relatedTweetId: body.tweetId,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.error.status || 500 });
  }

  return NextResponse.json({ result: result.data });
}
