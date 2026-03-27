"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useState, useTransition } from "react";

import type { DraftRecord, DraftType } from "@/src/features/drafts/types";
import type { FeedTweet } from "@/src/features/feed/types";

function createBlock() {
  return {
    id: `block-${Math.random().toString(36).slice(2, 10)}`,
    text: "",
  };
}

function statusMessage(type: DraftType) {
  if (type === "thread") {
    return "Thread blocks are posted sequentially as a reply chain.";
  }
  return "Drafts can be saved, submitted for approval, or posted immediately if policy allows.";
}

export function ComposeScreen() {
  const [mode, setMode] = useState<DraftType>("post");
  const [text, setText] = useState("");
  const [targetTweetId, setTargetTweetId] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [threadBlocks, setThreadBlocks] = useState([createBlock()]);
  const [targetPreview, setTargetPreview] = useState<FeedTweet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedDraft, setSavedDraft] = useState<DraftRecord | null>(null);
  const [pending, startTransition] = useTransition();

  const loadTargetPreview = useEffectEvent(async () => {
    if (!targetTweetId || (mode !== "reply" && mode !== "quote")) {
      setTargetPreview(null);
      return;
    }

    const response = await fetch(`/api/tweets/${targetTweetId}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      setTargetPreview(null);
      return;
    }

    const payload = (await response.json()) as { tweet: FeedTweet };
    setTargetPreview(payload.tweet);
  });

  useEffect(() => {
    void loadTargetPreview();
  }, [mode, targetTweetId]);

  const charCount =
    mode === "thread"
      ? threadBlocks.reduce((sum, block) => sum + block.text.length, 0)
      : text.length;

  function buildPayload(status?: DraftRecord["status"]) {
    return {
      type: mode,
      text,
      target_tweet_id: targetTweetId || null,
      target_user_id: targetUserId || null,
      status: status || "draft",
      scheduled_for: scheduledFor || null,
      metadata: {
        threadBlocks: mode === "thread" ? threadBlocks : [],
      },
    };
  }

  function persistDraft(nextStatus?: DraftRecord["status"], action?: "save" | "submit" | "post") {
    setError(null);

    startTransition(async () => {
      const createResponse = await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(nextStatus)),
      });

      const created = (await createResponse.json()) as
        | { draft: DraftRecord }
        | { error: { message: string } };

      if (!createResponse.ok || !("draft" in created)) {
        setError("error" in created ? created.error.message : "Unable to save draft.");
        return;
      }

      let latest = created.draft;

      if (action === "submit") {
        const submitResponse = await fetch(`/api/drafts/${latest.id}/submit`, {
          method: "POST",
        });
        const submitted = (await submitResponse.json()) as
          | { draft: DraftRecord }
          | { error: { message: string } };
        if (!submitResponse.ok || !("draft" in submitted)) {
          setError("error" in submitted ? submitted.error.message : "Unable to submit draft.");
          return;
        }
        latest = submitted.draft;
      }

      if (action === "post") {
        const postResponse = await fetch(`/api/drafts/${latest.id}/post`, {
          method: "POST",
        });
        const posted = (await postResponse.json()) as
          | { draft: DraftRecord; approval?: { id: string } | null }
          | { error: { message: string } };
        if (!postResponse.ok || !("draft" in posted)) {
          setError("error" in posted ? posted.error.message : "Unable to post draft.");
          return;
        }
        latest = posted.draft;
        if (posted.approval) {
          setError(`Approval ${posted.approval.id} created. Review it in Approvals.`);
        }
      }

      setSavedDraft(latest);
    });
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_32%),linear-gradient(180deg,_#07111d_0%,_#04070c_55%,_#020409_100%)] px-4 py-4 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <section className="rounded-3xl border border-border bg-panel/95 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_18px_40px_rgba(2,6,23,0.38)] backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap gap-2">
                <Link href="/" className="rounded-full border border-white/8 bg-white/5 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300">Dashboard</Link>
                <Link href="/feed" className="rounded-full border border-white/8 bg-white/5 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300">Feed</Link>
                <Link href="/queue" className="rounded-full border border-white/8 bg-white/5 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300">Queue</Link>
                <Link href="/approvals" className="rounded-full border border-white/8 bg-white/5 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300">Approvals</Link>
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">Compose</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-300">{statusMessage(mode)}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-panel-strong/85 px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">Character count</p>
              <p className="mt-2 text-2xl font-semibold text-white">{charCount}</p>
            </div>
          </div>
        </section>

        {error ? <section className="rounded-2xl border border-orange-400/20 bg-orange-400/10 px-4 py-3 text-sm text-orange-200">{error}</section> : null}
        {savedDraft ? <section className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">Draft `{savedDraft.id}` is now `{savedDraft.status}`.</section> : null}

        <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-white/8 bg-panel/95 p-4">
            <div className="flex flex-wrap gap-2">
              {(["post", "reply", "quote", "thread"] as DraftType[]).map((draftType) => (
                <button
                  key={draftType}
                  type="button"
                  onClick={() => setMode(draftType)}
                  className={`rounded-full border px-3 py-2 text-sm transition ${mode === draftType ? "border-accent/50 bg-accent/10 text-accent" : "border-white/8 bg-white/5 text-slate-300"}`}
                >
                  {draftType}
                </button>
              ))}
            </div>

            {(mode === "reply" || mode === "quote") ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="grid gap-2 text-sm text-slate-300">
                  <span>Target tweet ID</span>
                  <input
                    value={targetTweetId}
                    onChange={(event) => setTargetTweetId(event.target.value)}
                    className="rounded-2xl border border-white/8 bg-panel-strong/85 px-3 py-2 text-slate-100 outline-none ring-0"
                    placeholder="tweet id"
                  />
                </label>
                <label className="grid gap-2 text-sm text-slate-300">
                  <span>Target user ID</span>
                  <input
                    value={targetUserId}
                    onChange={(event) => setTargetUserId(event.target.value)}
                    className="rounded-2xl border border-white/8 bg-panel-strong/85 px-3 py-2 text-slate-100 outline-none ring-0"
                    placeholder="optional user id"
                  />
                </label>
              </div>
            ) : null}

            {mode !== "thread" ? (
              <label className="mt-4 grid gap-2 text-sm text-slate-300">
                <span>Editor</span>
                <textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  rows={10}
                  className="rounded-3xl border border-white/8 bg-panel-strong/85 px-4 py-3 text-sm leading-7 text-slate-100 outline-none"
                  placeholder="Draft the next operator action..."
                />
              </label>
            ) : (
              <div className="mt-4 space-y-3">
                {threadBlocks.map((block, index) => (
                  <div key={block.id} className="rounded-3xl border border-white/8 bg-panel-strong/85 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">Tweet {index + 1}</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setThreadBlocks((current) => {
                              if (index === 0) return current;
                              const next = [...current];
                              [next[index - 1], next[index]] = [next[index], next[index - 1]];
                              return next;
                            })
                          }
                          className="rounded-full border border-white/8 bg-white/5 px-3 py-1 text-xs text-slate-300"
                        >
                          Up
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setThreadBlocks((current) => {
                              if (index === current.length - 1) return current;
                              const next = [...current];
                              [next[index + 1], next[index]] = [next[index], next[index + 1]];
                              return next;
                            })
                          }
                          className="rounded-full border border-white/8 bg-white/5 px-3 py-1 text-xs text-slate-300"
                        >
                          Down
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setThreadBlocks((current) =>
                              current.length === 1
                                ? current
                                : current.filter((item) => item.id !== block.id),
                            )
                          }
                          className="rounded-full border border-white/8 bg-white/5 px-3 py-1 text-xs text-slate-300"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={block.text}
                      onChange={(event) =>
                        setThreadBlocks((current) =>
                          current.map((item) =>
                            item.id === block.id ? { ...item, text: event.target.value } : item,
                          ),
                        )
                      }
                      rows={5}
                      className="mt-3 w-full rounded-2xl border border-white/8 bg-[#09111d] px-4 py-3 text-sm leading-7 text-slate-100 outline-none"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setThreadBlocks((current) => [...current, createBlock()])}
                  className="rounded-full border border-white/8 bg-white/5 px-4 py-2 text-sm text-slate-200"
                >
                  Add tweet block
                </button>
              </div>
            )}

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="grid gap-2 text-sm text-slate-300">
                <span>Scheduled for</span>
                <input
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(event) => setScheduledFor(event.target.value)}
                  className="rounded-2xl border border-white/8 bg-panel-strong/85 px-3 py-2 text-slate-100 outline-none"
                />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" onClick={() => persistDraft("draft", "save")} className="rounded-full border border-white/8 bg-white/5 px-4 py-2 text-sm text-slate-200">
                Save draft
              </button>
              <button type="button" onClick={() => persistDraft("pending_approval", "submit")} className="rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm text-amber-200">
                Submit for approval
              </button>
              <button type="button" onClick={() => persistDraft("draft", "post")} className="rounded-full border border-accent/30 bg-accent/10 px-4 py-2 text-sm text-accent">
                Post now
              </button>
              <button type="button" onClick={() => persistDraft("scheduled", "save")} className="rounded-full border border-white/8 bg-white/5 px-4 py-2 text-sm text-slate-200">
                Save as scheduled
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-500">{pending ? "Processing operator action..." : "Drafts are persisted locally and safe for demo mode."}</p>
          </div>

          <div className="space-y-4">
            <section className="rounded-3xl border border-white/8 bg-panel/95 p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Target preview</p>
              {targetPreview ? (
                <div className="mt-3 rounded-2xl border border-white/8 bg-panel-strong/85 p-4">
                  <p className="text-sm font-semibold text-white">{targetPreview.authorName}</p>
                  <p className="mt-1 font-mono text-xs uppercase tracking-[0.18em] text-accent">{targetPreview.authorHandle}</p>
                  <p className="mt-3 text-sm leading-7 text-slate-200">{targetPreview.text}</p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-400">Enter a target tweet id for reply or quote mode to preview it when available.</p>
              )}
            </section>

            <section className="rounded-3xl border border-white/8 bg-panel/95 p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Operator notes</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                <li>Thread drafts are stored as editable blocks in draft metadata.</li>
                <li>Live posting is only attempted when live auth is available.</li>
                <li>Failed post attempts are sanitized before they are persisted.</li>
              </ul>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
