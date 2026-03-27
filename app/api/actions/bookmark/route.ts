import { NextRequest, NextResponse } from "next/server";

import { createXClient } from "@/src/features/x-client/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { tweetId?: string };
  if (!body.tweetId) {
    return NextResponse.json({ error: { message: "Missing tweetId." } }, { status: 400 });
  }

  const result = await createXClient().bookmarkTweet(body.tweetId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.error.status || 500 });
  }

  return NextResponse.json({ result: result.data });
}
