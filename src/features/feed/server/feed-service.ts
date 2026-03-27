import "server-only";

import { readOperatorStore } from "@/src/features/operator-store/server/store";
import type { FeedTweet } from "@/src/features/feed/types";
import { createXClient } from "@/src/features/x-client/server";

function sortTweets(tweets: FeedTweet[]) {
  return [...tweets].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export async function getFeedTweets() {
  const client = createXClient();
  const [timelineResult, store] = await Promise.all([
    client.getTimeline(),
    readOperatorStore(),
  ]);

  if (!timelineResult.ok) {
    return timelineResult;
  }

  const tweets: FeedTweet[] = timelineResult.data.map((tweet) => ({
    ...tweet,
    triageLabel: store.triage[tweet.id]?.label || null,
    inWatchlist: Boolean(store.watchlist[tweet.authorHandle]),
  }));

  return {
    ...timelineResult,
    data: sortTweets(tweets),
  };
}

export async function getMentionTweets() {
  const client = createXClient();
  const [mentionsResult, store] = await Promise.all([
    client.getMentions(),
    readOperatorStore(),
  ]);

  if (!mentionsResult.ok) {
    return mentionsResult;
  }

  const tweets: FeedTweet[] = mentionsResult.data.map((tweet) => ({
    ...tweet,
    triageLabel: store.triage[tweet.id]?.label || null,
    inWatchlist: Boolean(store.watchlist[tweet.authorHandle]),
  }));

  return {
    ...mentionsResult,
    data: sortTweets(tweets),
  };
}
