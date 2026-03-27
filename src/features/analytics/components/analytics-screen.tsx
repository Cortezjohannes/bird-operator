import Link from "next/link";

import type { AnalyticsSnapshot } from "@/src/features/analytics/types";

export function AnalyticsScreen({
  snapshot,
}: Readonly<{
  snapshot: AnalyticsSnapshot;
}>) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_32%),linear-gradient(180deg,_#07111d_0%,_#04070c_55%,_#020409_100%)] px-4 py-4 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <section className="rounded-3xl border border-border bg-panel/95 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_18px_40px_rgba(2,6,23,0.38)] backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap gap-2">
                <Link href="/" className="rounded-full border border-white/8 bg-white/5 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300">Dashboard</Link>
                <Link href="/logs" className="rounded-full border border-white/8 bg-white/5 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300">Logs</Link>
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">Analytics</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-300">Basic operator analytics for posting cadence, draft outcomes, and performance visibility.</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          {[
            ["Posts/day points", String(snapshot.postsPerDay.length)],
            ["Replies/day points", String(snapshot.repliesPerDay.length)],
            ["Tracked posts", String(snapshot.topPerformingPosts.length)],
            ["Follower snapshots", String(snapshot.followerSnapshots.length)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-3xl border border-white/8 bg-panel/95 p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-3xl border border-white/8 bg-panel/95 p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Posting trends</p>
            <div className="mt-4 space-y-3">
              {snapshot.postsPerDay.map((point) => (
                <div key={point.day} className="flex items-center justify-between rounded-2xl border border-white/8 bg-panel-strong/85 px-4 py-3 text-sm">
                  <span className="text-slate-300">{point.day}</span>
                  <span className="font-semibold text-white">{point.count} posts</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/8 bg-panel/95 p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Reply trends</p>
            <div className="mt-4 space-y-3">
              {snapshot.repliesPerDay.map((point) => (
                <div key={point.day} className="flex items-center justify-between rounded-2xl border border-white/8 bg-panel-strong/85 px-4 py-3 text-sm">
                  <span className="text-slate-300">{point.day}</span>
                  <span className="font-semibold text-white">{point.count} replies</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-3xl border border-white/8 bg-panel/95 p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Top performing posts</p>
            <div className="mt-4 overflow-hidden rounded-2xl border border-white/8">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-panel-strong/85 text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Post</th>
                    <th className="px-3 py-2">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.topPerformingPosts.map((post) => (
                    <tr key={post.postId} className="border-t border-white/8 bg-panel/70">
                      <td className="px-3 py-3 text-slate-200">{post.label}</td>
                      <td className="px-3 py-3 text-white">{post.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl border border-white/8 bg-panel/95 p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Draft category performance</p>
            <div className="mt-4 overflow-hidden rounded-2xl border border-white/8">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-panel-strong/85 text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Drafted</th>
                    <th className="px-3 py-2">Posted</th>
                    <th className="px-3 py-2">Failed</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.draftCategoryPerformance.map((row) => (
                    <tr key={row.category} className="border-t border-white/8 bg-panel/70">
                      <td className="px-3 py-3 text-slate-200">{row.category}</td>
                      <td className="px-3 py-3 text-white">{row.drafted}</td>
                      <td className="px-3 py-3 text-white">{row.posted}</td>
                      <td className="px-3 py-3 text-white">{row.failed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/8 bg-panel/95 p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Follower snapshots</p>
          <div className="mt-4 space-y-3">
            {snapshot.followerSnapshots.length === 0 ? (
              <p className="text-sm text-slate-400">No follower snapshots available yet.</p>
            ) : snapshot.followerSnapshots.map((point) => (
              <div key={point.day} className="flex items-center justify-between rounded-2xl border border-white/8 bg-panel-strong/85 px-4 py-3 text-sm">
                <span className="text-slate-300">{point.day}</span>
                <span className="font-semibold text-white">{point.followers.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
