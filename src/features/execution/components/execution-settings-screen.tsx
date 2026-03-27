"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import type { ExecutionSettingsSnapshot } from "@/src/features/execution/types";

export function ExecutionSettingsScreen({
  initialSettings,
}: Readonly<{
  initialSettings: ExecutionSettingsSnapshot;
}>) {
  const [settings, setSettings] = useState(initialSettings);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const response = await fetch("/api/settings/execution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          browserFallbackEnabled: settings.browserFallbackEnabled,
        }),
      });
      const payload = (await response.json()) as
        | { settings: ExecutionSettingsSnapshot }
        | { error: { message: string } };

      if (!response.ok || !("settings" in payload)) {
        setError("error" in payload ? payload.error.message : "Unable to save settings.");
        return;
      }

      setSettings(payload.settings);
      setError(null);
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
                <Link href="/settings/auth" className="rounded-full border border-white/8 bg-white/5 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300">Auth</Link>
                <Link href="/settings/approvals" className="rounded-full border border-white/8 bg-white/5 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300">Approvals</Link>
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">Execution Fallback</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-300">
                Prepare a browser fallback lane for future Playwright automation without storing cookies, tokens, or browser sessions in the repo.
              </p>
            </div>
            <button type="button" onClick={save} className="rounded-full border border-accent/30 bg-accent/10 px-4 py-2 text-sm text-accent">
              {pending ? "Saving..." : "Save settings"}
            </button>
          </div>
        </section>

        {error ? <section className="rounded-2xl border border-orange-400/20 bg-orange-400/10 px-4 py-3 text-sm text-orange-200">{error}</section> : null}

        <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-3xl border border-white/8 bg-panel/95 p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Fallback Toggle</p>
            <div className="mt-4 rounded-2xl border border-white/8 bg-panel-strong/85 p-4">
              <p className="text-sm text-slate-300">
                Enable this only if you want the console to mark failed live actions as fallback-eligible later.
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSettings((current) => ({ ...current, browserFallbackEnabled: true }))}
                  className={`rounded-full border px-3 py-2 text-xs ${
                    settings.browserFallbackEnabled
                      ? "border-accent/40 bg-accent/10 text-accent"
                      : "border-white/8 bg-white/5 text-slate-300"
                  }`}
                >
                  Enabled
                </button>
                <button
                  type="button"
                  onClick={() => setSettings((current) => ({ ...current, browserFallbackEnabled: false }))}
                  className={`rounded-full border px-3 py-2 text-xs ${
                    !settings.browserFallbackEnabled
                      ? "border-accent/40 bg-accent/10 text-accent"
                      : "border-white/8 bg-white/5 text-slate-300"
                  }`}
                >
                  Disabled
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/8 bg-panel/95 p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Status Panel</p>
            <div className="mt-4 rounded-2xl border border-white/8 bg-panel-strong/85 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/8 bg-white/5 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-300">
                  Provider {settings.status.provider}
                </span>
                <span className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] ${
                  settings.status.available
                    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                    : "border-amber-400/20 bg-amber-400/10 text-amber-200"
                }`}>
                  {settings.status.available ? "available" : "placeholder only"}
                </span>
              </div>
              <h2 className="mt-4 text-lg font-semibold text-white">{settings.status.headline}</h2>
              <p className="mt-2 text-sm text-slate-300">{settings.status.detail}</p>
              <p className="mt-3 rounded-2xl border border-white/8 bg-slate-950/50 p-3 text-sm text-slate-300">
                {settings.status.nextStep}
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
