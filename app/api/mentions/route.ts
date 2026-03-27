import { NextResponse } from "next/server";

import { getMentionTweets } from "@/src/features/feed/server/feed-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await getMentionTweets();

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.error.status || 500 });
  }

  return NextResponse.json({ tweets: result.data });
}
