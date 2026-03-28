"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { ActionLog, ActionLogFilters } from "@/src/features/logs/types";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function LogsScreen({
  initialLogs,
}: Readonly<{
  initialLogs: ActionLog[];
}>) {
  const [filters, setFilters] = useState<ActionLogFilters>({
    actionType: "all",
    status: "all",
    actor: "all",
    dateFrom: "",
    dateTo: "",
  });

  const actionTypes = Array.from(new Set(initialLogs.map((log) => log.action_type))).sort();
  const actors = Array.from(new Set(initialLogs.map((log) => log.actor))).sort();

  const filtered = useMemo(() => {
    return initialLogs.filter((log) => {
      if (filters.actionType !== "all" && log.action_type !== filters.actionType) {
        return false;
      }
      if (filters.status !== "all" && log.result_status !== filters.status) {
        return false;
      }
      if (filters.actor !== "all" && log.actor !== filters.actor) {
        return false;
      }
      if (filters.dateFrom && new Date(log.timestamp) < new Date(filters.dateFrom)) {
        return false;
      }
      if (filters.dateTo && new Date(log.timestamp) > new Date(`${filters.dateTo}T23:59:59`)) {
        return false;
      }
      return true;
    });
  }, [filters, initialLogs]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_32%),linear-gradient(180deg,_#07111d_0%,_#04070c_55%,_#020409_100%)] px-4 py-4 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <section className="rounded-3xl border border-border bg-panel/95 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_18px_40px_rgba(2,6,23,0.38)] backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap gap-2">
                <Link href="/" className="rounded-full border border-white/8 bg-white/5 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300">Dashboard</Link>
                <Link href="/analytics" className="rounded-full border border-white/8 bg-white/5 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300">Analytics</Link>
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">Action Logs</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-300">Sanitized public-repo-safe proof of operator actions, results, and auth method usage.</p>
            </div>
            <div className="text-xs text-slate-500">{filtered.length} records in view</div>
          </div>
        </section>

        <section className="grid gap-3 rounded-3xl border border-white/8 bg-panel/95 p-4 md:grid-cols-4">
          <label className="grid gap-2 text-sm text-slate-300">
            <span>Action type</span>
            <select value={filters.actionType} onChange={(event) => setFilters((current) => ({ ...current, actionType: event.target.value }))} className="rounded-2xl border border-white/8 bg-panel-strong/85 px-3 py-2 text-slate-100">
              <option value="all">All</option>
              {actionTypes.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm text-slate-300">
            <span>Status</span>
            <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as ActionLogFilters["status"] }))} className="rounded-2xl border border-white/8 bg-panel-strong/85 px-3 py-2 text-slate-100">
              {["all", "success", "failed", "queued", "skipped"].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm text-slate-300">
            <span>Actor</span>
            <select value={filters.actor} onChange={(event) => setFilters((current) => ({ ...current, actor: event.target.value }))} className="rounded-2xl border border-white/8 bg-panel-strong/85 px-3 py-2 text-slate-100">
              <option value="all">All</option>
              {actors.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <div className="grid gap-3 md:grid-cols-2 md:col-span-1">
            <label className="grid gap-2 text-sm text-slate-300">
              <span>From</span>
              <input type="date" value={filters.dateFrom} onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))} className="rounded-2xl border border-white/8 bg-panel-strong/85 px-3 py-2 text-slate-100" />
            </label>
            <label className="grid gap-2 text-sm text-slate-300">
              <span>To</span>
              <input type="date" value={filters.dateTo} onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))} className="rounded-2xl border border-white/8 bg-panel-strong/85 px-3 py-2 text-slate-100" />
            </label>
          </div>
        </section>

        <section className="space-y-3">
          {filtered.map((log) => (
            <article key={log.id} className="rounded-3xl border border-white/8 bg-panel/95 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-white">{log.action_type}</span>
                    <span className="rounded-full bg-white/5 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300">{log.result_status}</span>
                    <span className="rounded-full bg-accent/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-accent">{log.auth_method}</span>
                    <span className="rounded-full bg-white/5 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300">
                      fallback {log.fallback_result}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-slate-200">{log.payload_summary}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {formatDate(log.timestamp)} by {log.actor} ({log.actor_type})
                  </p>
                </div>
                <dl className="grid gap-2 text-xs text-slate-400">
                  <div><dt className="font-mono uppercase tracking-[0.18em] text-slate-500">Target</dt><dd>{log.target_type} {log.target_id || "none"}</dd></div>
                  <div><dt className="font-mono uppercase tracking-[0.18em] text-slate-500">Related tweet</dt><dd>{log.related_tweet_id || "none"}</dd></div>
                  <div><dt className="font-mono uppercase tracking-[0.18em] text-slate-500">Operator session</dt><dd>{log.operator_session_id || "none"}</dd></div>
                  <div><dt className="font-mono uppercase tracking-[0.18em] text-slate-500">Execution path</dt><dd>{log.execution_path || "direct"} / {log.operator_session_mode || "owner"}</dd></div>
                  <div><dt className="font-mono uppercase tracking-[0.18em] text-slate-500">Fallback</dt><dd>{log.fallback_available ? "ready" : "not installed"} / {log.fallback_attempted ? "attempted" : "not attempted"}</dd></div>
                </dl>
              </div>
              <p className="mt-4 rounded-2xl border border-white/8 bg-panel-strong/85 px-3 py-3 text-sm leading-6 text-slate-300">{log.result_excerpt}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
