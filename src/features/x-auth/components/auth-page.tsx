import Link from "next/link";

import { capabilityLabels } from "@/src/features/x-auth/capabilities";
import { RetestButton } from "@/src/features/x-auth/components/retest-button";
import type {
  AuthStatusPayload,
  CapabilityTestResult,
} from "@/src/features/x-auth/types";

function panelClassName(extra?: string) {
  return [
    "rounded-3xl border border-border bg-panel/95 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_18px_40px_rgba(2,6,23,0.38)] backdrop-blur",
    extra || "",
  ].join(" ");
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AuthPage({
  authStatus,
  capabilityResults,
}: Readonly<{
  authStatus: AuthStatusPayload;
  capabilityResults: CapabilityTestResult[];
}>) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_32%),linear-gradient(180deg,_#07111d_0%,_#04070c_55%,_#020409_100%)] px-4 py-4 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <section className={panelClassName("overflow-hidden p-0")}>
          <div className="flex flex-col gap-5 border-b border-white/6 bg-[linear-gradient(135deg,rgba(14,165,233,0.2),rgba(15,23,42,0.1)_40%,rgba(249,115,22,0.12))] px-5 py-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.28em] text-accent">
                  {authStatus.mode} mode
                </span>
                <span className="rounded-full border border-white/8 bg-white/5 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300">
                  Requested {authStatus.requestedMode}
                </span>
                <Link
                  href="/"
                  className="rounded-full border border-white/8 bg-white/5 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300 transition hover:border-accent/40 hover:bg-accent/10"
                >
                  Dashboard
                </Link>
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  Auth and Capability Diagnostics
                </h1>
                <p className="mt-2 max-w-3xl text-sm text-slate-300 sm:text-base">
                  Secrets stay server-side. The client receives only sanitized
                  auth detection summaries and capability probe results.
                </p>
              </div>
            </div>
            <RetestButton />
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="grid gap-4">
            <div className={panelClassName()}>
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-accent">
                Runtime
              </p>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-panel-strong/85 px-4 py-3">
                  <dt className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">
                    Current mode
                  </dt>
                  <dd className="mt-2 text-sm font-medium text-slate-100">
                    {authStatus.mode}
                  </dd>
                </div>
                <div className="rounded-2xl border border-white/8 bg-panel-strong/85 px-4 py-3">
                  <dt className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">
                    Live ready
                  </dt>
                  <dd className="mt-2 text-sm font-medium text-slate-100">
                    {authStatus.isLiveReady ? "yes" : "no"}
                  </dd>
                </div>
                <div className="rounded-2xl border border-white/8 bg-panel-strong/85 px-4 py-3 sm:col-span-2">
                  <dt className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">
                    Probe summary
                  </dt>
                  <dd className="mt-2 text-sm leading-6 text-slate-300">
                    {authStatus.liveProbeSummary}
                  </dd>
                </div>
              </dl>
            </div>

            <div className={panelClassName()}>
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-accent">
                Auth Methods
              </p>
              <div className="mt-4 space-y-3">
                {authStatus.detectedAuthMethods.map((method) => (
                  <div
                    key={method.key}
                    className="rounded-2xl border border-white/8 bg-panel-muted px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-100">
                          {method.label}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-slate-400">
                          {method.summary}
                        </p>
                      </div>
                      <span className="rounded-full border border-white/8 bg-white/5 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-300">
                        {method.detectedFields}/{method.expectedFields} fields
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-300">
                        configured: {method.configured ? "yes" : "no"}
                      </span>
                      <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-300">
                        live probes: {method.canBeUsedForLiveTests ? "enabled" : "not used"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={panelClassName()}>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-accent">
              Capability Matrix
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2 text-left">
                <thead>
                  <tr className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    <th className="px-3 py-2 font-mono">Capability</th>
                    <th className="px-3 py-2 font-mono">Supported</th>
                    <th className="px-3 py-2 font-mono">Mode</th>
                    <th className="px-3 py-2 font-mono">Auth</th>
                    <th className="px-3 py-2 font-mono">Last tested</th>
                    <th className="px-3 py-2 font-mono">Sanitized error</th>
                  </tr>
                </thead>
                <tbody>
                  {capabilityResults.map((result) => (
                    <tr key={result.capability} className="align-top">
                      <td className="rounded-l-2xl border-y border-l border-white/8 bg-panel-strong/85 px-3 py-3 text-sm font-medium text-slate-100">
                        {capabilityLabels[result.capability]}
                      </td>
                      <td className="border-y border-white/8 bg-panel-strong/85 px-3 py-3 text-sm text-slate-200">
                        <span
                          className={`rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] ${
                            result.supported
                              ? "bg-emerald-500/12 text-emerald-300"
                              : "bg-orange-500/12 text-orange-300"
                          }`}
                        >
                          {result.supported ? "supported" : "blocked"}
                        </span>
                      </td>
                      <td className="border-y border-white/8 bg-panel-strong/85 px-3 py-3 text-sm text-slate-300">
                        {result.mode}
                      </td>
                      <td className="border-y border-white/8 bg-panel-strong/85 px-3 py-3 text-sm text-slate-300">
                        {result.authMethodUsed}
                      </td>
                      <td className="border-y border-white/8 bg-panel-strong/85 px-3 py-3 text-sm text-slate-300">
                        {formatTimestamp(result.testedAt)}
                      </td>
                      <td className="rounded-r-2xl border-y border-r border-white/8 bg-panel-strong/85 px-3 py-3 text-sm leading-6 text-slate-400">
                        {result.error || "No error"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
