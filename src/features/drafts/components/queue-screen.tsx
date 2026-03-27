"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useState, useTransition } from "react";

import type { DraftRecord, DraftStatus } from "@/src/features/drafts/types";

const queueGroups: Array<{ status: DraftStatus; label: string }> = [
  { status: "draft", label: "Drafts" },
  { status: "scheduled", label: "Scheduled" },
  { status: "pending_approval", label: "Pending approval" },
  { status: "failed", label: "Failed" },
  { status: "posted", label: "Posted history" },
];

function formatDate(value: string | null) {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function QueueScreen() {
  const [drafts, setDrafts] = useState<DraftRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const loadDrafts = useEffectEvent(async () => {
    const response = await fetch("/api/drafts", { cache: "no-store" });
    const payload = (await response.json()) as
      | { drafts: DraftRecord[] }
      | { error: { message: string } };

    if (!response.ok || !("drafts" in payload)) {
      setError("error" in payload ? payload.error.message : "Unable to load drafts.");
      return;
    }

    setDrafts(payload.drafts);
  });

  useEffect(() => {
    void loadDrafts();
  }, []);

  function mutateDraft(id: string, action: "post" | "delete") {
    startTransition(async () => {
      const response = await fetch(
        action === "post" ? `/api/drafts/${id}/post` : `/api/drafts/${id}`,
        {
          method: action === "post" ? "POST" : "DELETE",
        },
      );

      const payload = (await response.json()) as
        | { draft: DraftRecord }
        | { deleted: boolean }
        | { error: { message: string } };

      if (!response.ok) {
        setError("error" in payload ? payload.error.message : "Unable to update draft.");
        return;
      }

      const refreshResponse = await fetch("/api/drafts", { cache: "no-store" });
      const refreshPayload = (await refreshResponse.json()) as
        | { drafts: DraftRecord[] }
        | { error: { message: string } };

      if (!refreshResponse.ok || !("drafts" in refreshPayload)) {
        setError(
          "error" in refreshPayload
            ? refreshPayload.error.message
            : "Unable to refresh drafts.",
        );
        return;
      }

      setDrafts(refreshPayload.drafts);
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
                <Link href="/compose" className="rounded-full border border-white/8 bg-white/5 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300">Compose</Link>
                <Link href="/approvals" className="rounded-full border border-white/8 bg-white/5 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300">Approvals</Link>
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">Draft Queue</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-300">Operational lane for drafts, approvals, scheduled posts, failures, and posting history.</p>
            </div>
            <div className="text-xs text-slate-500">{pending ? "Updating queue..." : `${drafts.length} drafts tracked`}</div>
          </div>
        </section>

        {error ? <section className="rounded-2xl border border-orange-400/20 bg-orange-400/10 px-4 py-3 text-sm text-orange-200">{error}</section> : null}

        <section className="grid gap-4 xl:grid-cols-2">
          {queueGroups.map((group) => {
            const items = drafts.filter((draft) => draft.status === group.status);
            return (
              <div key={group.status} className="rounded-3xl border border-white/8 bg-panel/95 p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">{group.label}</h2>
                  <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-400">{items.length}</span>
                </div>
                <div className="mt-4 space-y-3">
                  {items.length === 0 ? (
                    <div className="rounded-2xl border border-white/8 bg-panel-strong/85 px-4 py-4 text-sm text-slate-500">No items.</div>
                  ) : (
                    items.map((draft) => (
                      <article key={draft.id} className="rounded-2xl border border-white/8 bg-panel-strong/85 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">{draft.type}</p>
                            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-accent">{draft.id}</p>
                          </div>
                          <span className="rounded-full border border-white/8 bg-white/5 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300">{draft.status}</span>
                        </div>
                        <p className="mt-3 text-sm leading-7 text-slate-200">{draft.type === "thread" ? `${draft.metadata.threadBlocks?.length || 0} blocks in thread` : draft.text || "Empty draft"}</p>
                        <dl className="mt-4 grid gap-2 sm:grid-cols-2">
                          <div>
                            <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">Updated</dt>
                            <dd className="mt-1 text-xs text-slate-400">{formatDate(draft.updated_at)}</dd>
                          </div>
                          <div>
                            <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">Scheduled</dt>
                            <dd className="mt-1 text-xs text-slate-400">{formatDate(draft.scheduled_for)}</dd>
                          </div>
                        </dl>
                        {draft.metadata.lastError ? (
                          <p className="mt-3 rounded-2xl border border-orange-400/20 bg-orange-400/10 px-3 py-2 text-xs leading-6 text-orange-200">{draft.metadata.lastError.message}</p>
                        ) : null}
                        <div className="mt-4 flex flex-wrap gap-2">
                          {(draft.status === "draft" || draft.status === "failed" || draft.status === "scheduled" || draft.status === "pending_approval") ? (
                            <button type="button" onClick={() => mutateDraft(draft.id, "post")} className="rounded-full border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent">Post now</button>
                          ) : null}
                          <button type="button" onClick={() => mutateDraft(draft.id, "delete")} className="rounded-full border border-white/8 bg-white/5 px-3 py-2 text-sm text-slate-300">Delete</button>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </main>
  );
}
