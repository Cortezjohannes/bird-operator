"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useMemo, useState, useTransition } from "react";

import type { TriageLabel } from "@/src/features/operator-store/types";
import type { FeedTweet } from "@/src/features/feed/types";

type FeedFilter = "all" | "unread" | "high_engagement" | "watchlist_only";

interface FeedScreenProps {
  title: string;
  description: string;
  source: "feed" | "mentions";
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function totalEngagement(tweet: FeedTweet) {
  const metrics = tweet.metrics || {};
  return (
    (metrics.likes || 0) +
    (metrics.reposts || 0) +
    (metrics.replies || 0) +
    (metrics.bookmarks || 0)
  );
}

function metricValue(value: number | undefined) {
  return typeof value === "number" ? value.toLocaleString() : "0";
}

export function FeedScreen({ title, description, source }: Readonly<FeedScreenProps>) {
  const [tweets, setTweets] = useState<FeedTweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [pending, startTransition] = useTransition();

  const loadTweets = useEffectEvent(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        source === "feed" ? "/api/feed" : "/api/mentions",
        { cache: "no-store" },
      );
      const payload = (await response.json()) as
        | { tweets: FeedTweet[] }
        | { error: { message: string } };

      if (!response.ok || !("tweets" in payload)) {
        setError("error" in payload ? payload.error.message : "Unable to load tweets.");
        setTweets([]);
        return;
      }

      setTweets(payload.tweets);
    } catch {
      setError("Unable to load tweets.");
      setTweets([]);
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    void loadTweets();
  }, [source]);

  const filteredTweets = useMemo(() => {
    return tweets.filter((tweet) => {
      if (filter === "unread") {
        return Boolean(tweet.unread);
      }
      if (filter === "high_engagement") {
        return totalEngagement(tweet) >= 100;
      }
      if (filter === "watchlist_only") {
        return tweet.inWatchlist;
      }
      return true;
    });
  }, [filter, tweets]);

  function updateTriage(tweetId: string, label: TriageLabel) {
    startTransition(async () => {
      const response = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tweetId, label }),
      });

      if (!response.ok) {
        setError("Unable to save triage label.");
        return;
      }

      setTweets((current) =>
        current.map((tweet) =>
          tweet.id === tweetId ? { ...tweet, triageLabel: label } : tweet,
        ),
      );
    });
  }

  function quickAction(endpoint: string, body: Record<string, string>, updater?: () => void) {
    startTransition(async () => {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        setError("Action failed.");
        return;
      }

      updater?.();
    });
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_32%),linear-gradient(180deg,_#07111d_0%,_#04070c_55%,_#020409_100%)] px-4 py-4 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <section className="rounded-3xl border border-border bg-panel/95 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_18px_40px_rgba(2,6,23,0.38)] backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/"
                  className="rounded-full border border-white/8 bg-white/5 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300 transition hover:border-accent/40 hover:bg-accent/10"
                >
                  Dashboard
                </Link>
                <Link
                  href="/feed"
                  className="rounded-full border border-white/8 bg-white/5 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300 transition hover:border-accent/40 hover:bg-accent/10"
                >
                  Feed
                </Link>
                <Link
                  href="/mentions"
                  className="rounded-full border border-white/8 bg-white/5 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300 transition hover:border-accent/40 hover:bg-accent/10"
                >
                  Mentions
                </Link>
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
                {title}
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-300">{description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                ["all", "All"],
                ["unread", "Unread"],
                ["high_engagement", "High engagement"],
                ["watchlist_only", "Watchlist only"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value as FeedFilter)}
                  className={`rounded-full border px-3 py-2 text-sm transition ${
                    filter === value
                      ? "border-accent/50 bg-accent/10 text-accent"
                      : "border-white/8 bg-white/5 text-slate-300 hover:border-accent/30 hover:bg-accent/10"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {error ? (
          <section className="rounded-2xl border border-orange-400/20 bg-orange-400/10 px-4 py-3 text-sm text-orange-200">
            {error}
          </section>
        ) : null}

        <section className="grid gap-3">
          {loading ? (
            <div className="rounded-3xl border border-white/8 bg-panel/95 px-4 py-8 text-sm text-slate-400">
              Loading operator view...
            </div>
          ) : filteredTweets.length === 0 ? (
            <div className="rounded-3xl border border-white/8 bg-panel/95 px-4 py-8 text-sm text-slate-400">
              No tweets matched the current filter.
            </div>
          ) : (
            filteredTweets.map((tweet) => (
              <article
                key={tweet.id}
                className="rounded-3xl border border-white/8 bg-panel/95 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_18px_40px_rgba(2,6,23,0.3)]"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-white">
                        {tweet.authorName}
                      </span>
                      <span className="font-mono text-xs uppercase tracking-[0.18em] text-accent">
                        {tweet.authorHandle}
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatTimestamp(tweet.createdAt)}
                      </span>
                      {tweet.unread ? (
                        <span className="rounded-full bg-emerald-500/12 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-300">
                          New
                        </span>
                      ) : null}
                      {tweet.inWatchlist ? (
                        <span className="rounded-full bg-sky-500/12 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-sky-300">
                          Watchlist
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-200">
                      {tweet.text}
                    </p>
                    <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                      <div className="rounded-2xl border border-white/8 bg-panel-strong/85 px-3 py-2">
                        <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                          Replies
                        </dt>
                        <dd className="mt-1 text-sm text-slate-200">
                          {metricValue(tweet.metrics?.replies)}
                        </dd>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-panel-strong/85 px-3 py-2">
                        <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                          Reposts
                        </dt>
                        <dd className="mt-1 text-sm text-slate-200">
                          {metricValue(tweet.metrics?.reposts)}
                        </dd>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-panel-strong/85 px-3 py-2">
                        <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                          Likes
                        </dt>
                        <dd className="mt-1 text-sm text-slate-200">
                          {metricValue(tweet.metrics?.likes)}
                        </dd>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-panel-strong/85 px-3 py-2">
                        <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                          Bookmarks
                        </dt>
                        <dd className="mt-1 text-sm text-slate-200">
                          {metricValue(tweet.metrics?.bookmarks)}
                        </dd>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-panel-strong/85 px-3 py-2">
                        <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                          Impressions
                        </dt>
                        <dd className="mt-1 text-sm text-slate-200">
                          {metricValue(tweet.metrics?.impressions)}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="w-full max-w-sm space-y-3">
                    <div className="rounded-2xl border border-white/8 bg-panel-strong/85 p-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                        Quick actions
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            quickAction("/api/actions/draft-reply", {
                              tweetId: tweet.id,
                              text: `Reply draft for ${tweet.id}`,
                            })
                          }
                          className="rounded-full border border-white/8 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:border-accent/30 hover:bg-accent/10"
                        >
                          Draft reply
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            quickAction("/api/actions/draft-quote", {
                              tweetId: tweet.id,
                              text: `Quote draft for ${tweet.id}`,
                            })
                          }
                          className="rounded-full border border-white/8 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:border-accent/30 hover:bg-accent/10"
                        >
                          Draft quote
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            quickAction("/api/actions/like", { tweetId: tweet.id })
                          }
                          className="rounded-full border border-white/8 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:border-accent/30 hover:bg-accent/10"
                        >
                          Like
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            quickAction("/api/actions/repost", { tweetId: tweet.id })
                          }
                          className="rounded-full border border-white/8 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:border-accent/30 hover:bg-accent/10"
                        >
                          Repost
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            quickAction("/api/actions/bookmark", { tweetId: tweet.id })
                          }
                          className="rounded-full border border-white/8 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:border-accent/30 hover:bg-accent/10"
                        >
                          Bookmark
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            quickAction(
                              "/api/watchlist",
                              {
                                userHandle: tweet.authorHandle,
                                userName: tweet.authorName,
                              },
                              () =>
                                setTweets((current) =>
                                  current.map((item) =>
                                    item.id === tweet.id
                                      ? { ...item, inWatchlist: true }
                                      : item,
                                  ),
                                ),
                            )
                          }
                          className="rounded-full border border-white/8 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:border-accent/30 hover:bg-accent/10"
                        >
                          Add author to watchlist
                        </button>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/8 bg-panel-strong/85 p-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                        Triage
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {[
                          ["reply_worthy", "Reply worthy"],
                          ["quote_worthy", "Quote worthy"],
                          ["ignored", "Ignored"],
                          ["saved", "Saved"],
                        ].map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => updateTriage(tweet.id, value as TriageLabel)}
                            className={`rounded-full border px-3 py-2 text-sm transition ${
                              tweet.triageLabel === value
                                ? "border-accent/50 bg-accent/10 text-accent"
                                : "border-white/8 bg-white/5 text-slate-300 hover:border-accent/30 hover:bg-accent/10"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}
        </section>

        <div className="text-xs text-slate-500">
          {pending ? "Applying operator action..." : `${filteredTweets.length} items in view`}
        </div>
      </div>
    </main>
  );
}
