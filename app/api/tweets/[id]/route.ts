import { NextResponse } from "next/server";

import { getFeedTweets, getMentionTweets } from "@/src/features/feed/server/feed-service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [feed, mentions] = await Promise.all([getFeedTweets(), getMentionTweets()]);

  const sources = [
    feed.ok ? feed.data : [],
    mentions.ok ? mentions.data : [],
  ];

  const found = sources.flat().find((tweet) => tweet.id === id);
  if (!found) {
    return NextResponse.json({ error: { message: "Tweet preview not found." } }, { status: 404 });
  }

  return NextResponse.json({ tweet: found });
}
