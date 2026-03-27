"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import type { ApprovalRequest } from "@/src/features/approvals/types";

interface ApprovalWithPreview extends ApprovalRequest {
  previewText: string;
}

function formatDate(value: string | null) {
  if (!value) return "Not reviewed";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ApprovalsScreen({
  initialApprovals,
}: Readonly<{
  initialApprovals: ApprovalRequest[];
}>) {
  const [approvals, setApprovals] = useState<ApprovalWithPreview[]>(
    initialApprovals.map((approval) => ({
      ...approval,
      previewText: JSON.stringify(approval.payload_json, null, 2),
    })),
  );
  const [draftEdits, setDraftEdits] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function loadApprovals() {
    const response = await fetch("/api/approvals", { cache: "no-store" });
    const payload = (await response.json()) as
      | { approvals: ApprovalRequest[] }
      | { error: { message: string } };

    if (!response.ok || !("approvals" in payload)) {
      setError("error" in payload ? payload.error.message : "Unable to load approvals.");
      return;
    }

    const enriched = payload.approvals.map((approval) => ({
      ...approval,
      previewText: JSON.stringify(approval.payload_json, null, 2),
    }));
    setApprovals(enriched);
  }

  function review(id: string, action: "approve" | "reject") {
    startTransition(async () => {
      const response = await fetch(
        action === "approve"
          ? `/api/approvals/${id}/approve`
          : `/api/approvals/${id}/reject`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body:
            action === "approve"
              ? JSON.stringify({ editedText: draftEdits[id] || "" })
              : undefined,
        },
      );

      const payload = (await response.json()) as
        | { approval: ApprovalRequest }
        | { error: { message: string } };

      if (!response.ok) {
        setError("error" in payload ? payload.error.message : "Unable to review approval.");
        return;
      }

      await loadApprovals();
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
                <Link href="/queue" className="rounded-full border border-white/8 bg-white/5 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300">Queue</Link>
                <Link href="/settings/approvals" className="rounded-full border border-white/8 bg-white/5 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300">Approval settings</Link>
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">Approvals</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-300">Review pending operator actions with sanitized payload previews before execution.</p>
            </div>
            <div className="text-xs text-slate-500">{pending ? "Applying review..." : `${approvals.filter((item) => item.status === "pending").length} pending`}</div>
          </div>
        </section>

        {error ? <section className="rounded-2xl border border-orange-400/20 bg-orange-400/10 px-4 py-3 text-sm text-orange-200">{error}</section> : null}

        <section className="space-y-4">
          {approvals.length === 0 ? (
            <div className="rounded-3xl border border-white/8 bg-panel/95 px-4 py-8 text-sm text-slate-400">No approval requests yet.</div>
          ) : (
            approvals.map((approval) => (
              <article key={approval.id} className="rounded-3xl border border-white/8 bg-panel/95 p-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-white">{approval.action_type}</span>
                      <span className="rounded-full bg-white/5 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300">{approval.status}</span>
                      <span className="rounded-full bg-amber-500/12 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-amber-300">{approval.priority}</span>
                    </div>
                    <p className="mt-3 text-sm text-slate-200">{approval.reason}</p>
                    <p className="mt-2 text-xs text-slate-500">Requested by {approval.requested_by} on {formatDate(approval.created_at)}</p>
                    <p className="mt-1 text-xs text-slate-500">Reviewed by {approval.reviewed_by || "none"} at {formatDate(approval.reviewed_at)}</p>
                    <div className="mt-4 rounded-2xl border border-white/8 bg-panel-strong/85 p-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">Sanitized payload preview</p>
                      <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs leading-6 text-slate-300">{approval.previewText}</pre>
                    </div>
                  </div>

                  <div className="w-full max-w-md space-y-3">
                    <div className="rounded-2xl border border-white/8 bg-panel-strong/85 p-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">Edit and approve</p>
                      <textarea
                        value={draftEdits[approval.id] || ""}
                        onChange={(event) =>
                          setDraftEdits((current) => ({
                            ...current,
                            [approval.id]: event.target.value,
                          }))
                        }
                        rows={8}
                        className="mt-3 w-full rounded-2xl border border-white/8 bg-[#09111d] px-4 py-3 text-sm leading-7 text-slate-100 outline-none"
                        placeholder="Optional edited text. For threads, separate blocks with a line containing ---"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {approval.status === "pending" ? (
                        <>
                          <button type="button" onClick={() => review(approval.id, "approve")} className="rounded-full border border-accent/30 bg-accent/10 px-4 py-2 text-sm text-accent">Approve</button>
                          <button type="button" onClick={() => review(approval.id, "reject")} className="rounded-full border border-orange-400/30 bg-orange-400/10 px-4 py-2 text-sm text-orange-200">Reject</button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
