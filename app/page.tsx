import {
  ActivityFeedCard,
  AnalyticsCard,
  ComposerCard,
  DiagnosticsCard,
  HeaderBar,
  OperatorQueueCard,
  SurfaceCard,
  WatchlistCard,
} from "@/src/features/console/components/dashboard";
import { getConsoleSnapshot } from "@/src/features/console/server/snapshot";
import Link from "next/link";

export default function Home() {
  const snapshot = getConsoleSnapshot();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_32%),linear-gradient(180deg,_#07111d_0%,_#04070c_55%,_#020409_100%)] px-4 py-4 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <div className="flex justify-end">
          <div className="flex flex-wrap gap-2">
            <Link
              href="/compose"
              className="rounded-full border border-white/8 bg-white/5 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300 transition hover:border-accent/40 hover:bg-accent/10"
            >
              Compose
            </Link>
            <Link
              href="/queue"
              className="rounded-full border border-white/8 bg-white/5 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300 transition hover:border-accent/40 hover:bg-accent/10"
            >
              Queue
            </Link>
            <Link
              href="/approvals"
              className="rounded-full border border-white/8 bg-white/5 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300 transition hover:border-accent/40 hover:bg-accent/10"
            >
              Approvals
            </Link>
            <Link
              href="/profile"
              className="rounded-full border border-white/8 bg-white/5 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300 transition hover:border-accent/40 hover:bg-accent/10"
            >
              Profile
            </Link>
            <Link
              href="/logs"
              className="rounded-full border border-white/8 bg-white/5 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300 transition hover:border-accent/40 hover:bg-accent/10"
            >
              Logs
            </Link>
            <Link
              href="/analytics"
              className="rounded-full border border-white/8 bg-white/5 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300 transition hover:border-accent/40 hover:bg-accent/10"
            >
              Analytics
            </Link>
            <Link
              href="/feed"
              className="rounded-full border border-white/8 bg-white/5 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300 transition hover:border-accent/40 hover:bg-accent/10"
            >
              Feed
            </Link>
            <Link
              href="/mentions"
              className="rounded-full border border-white/8 bg-white/5 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300 transition hover:border-accent/40 hover:bg-accent/10"
            >
              Mentions
            </Link>
            <Link
              href="/settings/auth"
              className="rounded-full border border-white/8 bg-white/5 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300 transition hover:border-accent/40 hover:bg-accent/10"
            >
              Auth diagnostics
            </Link>
            <Link
              href="/settings/approvals"
              className="rounded-full border border-white/8 bg-white/5 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300 transition hover:border-accent/40 hover:bg-accent/10"
            >
              Approval settings
            </Link>
          </div>
        </div>
        <HeaderBar snapshot={snapshot} />
        <section className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
          <div className="grid gap-4">
            <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <ComposerCard snapshot={snapshot} />
              <DiagnosticsCard snapshot={snapshot} />
            </div>
            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <ActivityFeedCard snapshot={snapshot} />
              <OperatorQueueCard snapshot={snapshot} />
            </div>
          </div>
          <div className="grid gap-4">
            <AnalyticsCard snapshot={snapshot} />
            <WatchlistCard snapshot={snapshot} />
            <SurfaceCard snapshot={snapshot} />
          </div>
        </section>
      </div>
    </main>
  );
}
