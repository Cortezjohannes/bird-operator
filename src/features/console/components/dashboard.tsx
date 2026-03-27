import type { ConsoleSnapshot } from "@/src/features/console/types";

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function Panel({
  children,
  className,
}: Readonly<{
  children: React.ReactNode;
  className?: string;
}>) {
  return (
    <section
      className={cn(
        "rounded-3xl border border-border bg-panel/95 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_18px_40px_rgba(2,6,23,0.38)] backdrop-blur",
        className,
      )}
    >
      {children}
    </section>
  );
}

function SectionLabel({
  eyebrow,
  title,
  detail,
}: Readonly<{
  eyebrow: string;
  title: string;
  detail: string;
}>) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-accent">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-lg font-semibold tracking-tight text-slate-50">
          {title}
        </h2>
      </div>
      <p className="max-w-52 text-right text-sm text-slate-400">{detail}</p>
    </div>
  );
}

export function HeaderBar({
  snapshot,
}: Readonly<{
  snapshot: ConsoleSnapshot;
}>) {
  return (
    <Panel className="overflow-hidden p-0">
      <div className="flex flex-col gap-5 border-b border-white/6 bg-[linear-gradient(135deg,rgba(14,165,233,0.2),rgba(15,23,42,0.1)_40%,rgba(249,115,22,0.12))] px-5 py-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.28em] text-accent">
              {snapshot.environmentLabel}
            </span>
            <span className="rounded-full border border-white/8 bg-white/5 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300">
              Single account first
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              X Operator Console
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-base">
              Deliberate mission-control workspace for timeline review, drafting,
              approvals, and account operations without exposing secrets
              client-side.
            </p>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-white/8 bg-panel-strong/80 px-4 py-3">
            <dt className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">
              Account
            </dt>
            <dd className="mt-2 text-sm font-medium text-slate-100">
              {snapshot.accountLabel}
            </dd>
          </div>
          <div className="rounded-2xl border border-white/8 bg-panel-strong/80 px-4 py-3">
            <dt className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">
              Queue
            </dt>
            <dd className="mt-2 text-sm font-medium text-slate-100">
              {snapshot.queue.length} open actions
            </dd>
          </div>
          <div className="rounded-2xl border border-white/8 bg-panel-strong/80 px-4 py-3">
            <dt className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">
              Watchlist
            </dt>
            <dd className="mt-2 text-sm font-medium text-slate-100">
              {snapshot.watchlist.length} targets
            </dd>
          </div>
          <div className="rounded-2xl border border-white/8 bg-panel-strong/80 px-4 py-3">
            <dt className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">
              Approvals
            </dt>
            <dd className="mt-2 text-sm font-medium text-slate-100">
              {snapshot.analytics.pendingApprovals} pending
            </dd>
          </div>
        </dl>
      </div>
    </Panel>
  );
}

export function ComposerCard({
  snapshot,
}: Readonly<{
  snapshot: ConsoleSnapshot;
}>) {
  return (
    <Panel className="space-y-4">
      <SectionLabel
        eyebrow="Compose"
        title={snapshot.composerDraft.title}
        detail="Server actions and approval routing come in a later phase."
      />
      <div className="rounded-2xl border border-white/8 bg-panel-strong/90 p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">
            Draft body
          </span>
          <span className="text-xs text-slate-500">148 chars</span>
        </div>
        <p className="text-sm leading-7 text-slate-200">{snapshot.composerDraft.body}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {["Post", "Reply", "Quote", "Thread", "Bookmark target"].map((label) => (
          <button
            key={label}
            type="button"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:border-accent/40 hover:bg-accent/10"
          >
            {label}
          </button>
        ))}
      </div>
    </Panel>
  );
}

export function DiagnosticsCard({
  snapshot,
}: Readonly<{
  snapshot: ConsoleSnapshot;
}>) {
  return (
    <Panel className="space-y-4">
      <SectionLabel
        eyebrow="Diagnostics"
        title="Capability Readiness"
        detail="Live mode stays off unless the required server env vars are present."
      />
      <div className="space-y-3">
        {snapshot.capabilities.map((capability) => (
          <div
            key={capability.key}
            className="rounded-2xl border border-white/8 bg-panel-muted px-4 py-3"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-100">{capability.label}</p>
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.24em]",
                  capability.state === "available" &&
                    "bg-emerald-500/12 text-emerald-300",
                  capability.state === "partial" &&
                    "bg-amber-500/12 text-amber-300",
                  capability.state === "blocked" &&
                    "bg-orange-500/12 text-orange-300",
                )}
              >
                {capability.state}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              {capability.detail}
            </p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function ActivityFeedCard({
  snapshot,
}: Readonly<{
  snapshot: ConsoleSnapshot;
}>) {
  return (
    <Panel className="space-y-4">
      <SectionLabel
        eyebrow="Activity"
        title="Recent Operator Log"
        detail="Seeded mock data for demo mode. No sensitive runtime logs are committed."
      />
      <div className="space-y-3">
        {snapshot.activity.map((item) => (
          <div
            key={item.id}
            className="grid gap-2 rounded-2xl border border-white/8 bg-panel-strong/85 px-4 py-3 sm:grid-cols-[1fr_auto]"
          >
            <div>
              <p className="text-sm text-slate-100">
                <span className="font-medium">{item.actor}</span> {item.action}{" "}
                <span className="text-accent">{item.target}</span>
              </p>
              <p className="mt-1 text-xs text-slate-500">{item.occurredAt}</p>
            </div>
            <div className="justify-self-start sm:justify-self-end">
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em]",
                  item.risk === "low" && "bg-emerald-500/12 text-emerald-300",
                  item.risk === "medium" && "bg-amber-500/12 text-amber-300",
                  item.risk === "high" && "bg-orange-500/12 text-orange-300",
                )}
              >
                {item.risk} risk
              </span>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function OperatorQueueCard({
  snapshot,
}: Readonly<{
  snapshot: ConsoleSnapshot;
}>) {
  return (
    <Panel className="space-y-4">
      <SectionLabel
        eyebrow="Queue"
        title="Pending Actions"
        detail="Approvals, drafts, and scheduled actions live in one operational lane."
      />
      <div className="space-y-3">
        {snapshot.queue.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-white/8 bg-panel-muted px-4 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-100">{item.title}</p>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">
                  {item.type}
                </p>
              </div>
              <span className="rounded-full border border-white/8 bg-white/5 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-300">
                {item.status.replace("_", " ")}
              </span>
            </div>
            <p className="mt-3 text-xs text-slate-500">{item.dueLabel}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function AnalyticsCard({
  snapshot,
}: Readonly<{
  snapshot: ConsoleSnapshot;
}>) {
  return (
    <Panel className="space-y-4">
      <SectionLabel
        eyebrow="Analytics"
        title="Baseline Signals"
        detail="Phase 1 keeps analytics intentionally simple and read-only."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          ["Followers", snapshot.analytics.followers],
          ["Engagement rate", snapshot.analytics.engagementRate],
          ["Median response", snapshot.analytics.responseMedian],
          ["Pending approvals", String(snapshot.analytics.pendingApprovals)],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-white/8 bg-panel-strong/85 px-4 py-4"
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">
              {label}
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-white">
              {value}
            </p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function WatchlistCard({
  snapshot,
}: Readonly<{
  snapshot: ConsoleSnapshot;
}>) {
  return (
    <Panel className="space-y-4">
      <SectionLabel
        eyebrow="Watchlist"
        title="Target Accounts"
        detail="Seed data is intentionally generic so the repository stays safe to publish."
      />
      <div className="space-y-3">
        {snapshot.watchlist.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-white/8 bg-panel-muted px-4 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-100">{item.name}</p>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.22em] text-accent">
                  {item.handle}
                </p>
              </div>
              <span className="text-xs text-slate-500">{item.lastSeen}</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-400">{item.note}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function SurfaceCard({
  snapshot,
}: Readonly<{
  snapshot: ConsoleSnapshot;
}>) {
  return (
    <Panel className="space-y-4">
      <SectionLabel
        eyebrow="Profile Surface"
        title="Editable Profile Fields"
        detail="Account-level security settings remain intentionally out of scope."
      />
      <dl className="space-y-3">
        {[
          ["Display name", snapshot.profile.displayName],
          ["Handle", snapshot.profile.handle],
          ["Bio", snapshot.profile.bio],
          ["Location", snapshot.profile.location],
          ["URL", snapshot.profile.url],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-white/8 bg-panel-strong/85 px-4 py-3"
          >
            <dt className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">
              {label}
            </dt>
            <dd className="mt-2 text-sm leading-6 text-slate-200">{value}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}
