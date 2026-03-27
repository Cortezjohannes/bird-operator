"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { sensitiveActionTypes } from "@/src/features/approvals/server/policy";
import type {
  ApprovalActionType,
  ApprovalPolicySettings,
  ApprovalPreset,
} from "@/src/features/approvals/types";

export function ApprovalSettingsScreen({
  initialSettings,
}: Readonly<{
  initialSettings: ApprovalPolicySettings;
}>) {
  const [settings, setSettings] = useState<ApprovalPolicySettings>(initialSettings);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const response = await fetch("/api/settings/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const payload = (await response.json()) as
        | { settings: ApprovalPolicySettings }
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
                <Link href="/approvals" className="rounded-full border border-white/8 bg-white/5 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300">Approvals</Link>
                <Link href="/settings/auth" className="rounded-full border border-white/8 bg-white/5 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300">Auth</Link>
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">Approval Policy</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-300">Configure preset behavior and action-level overrides for sensitive operator actions.</p>
            </div>
            <button type="button" onClick={save} className="rounded-full border border-accent/30 bg-accent/10 px-4 py-2 text-sm text-accent">
              {pending ? "Saving..." : "Save policy"}
            </button>
          </div>
        </section>

        {error ? <section className="rounded-2xl border border-orange-400/20 bg-orange-400/10 px-4 py-3 text-sm text-orange-200">{error}</section> : null}

        <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-3xl border border-white/8 bg-panel/95 p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Preset</p>
            <div className="mt-4 space-y-2">
              {[
                ["manual", "Manual"],
                ["semi_auto", "Semi-auto"],
                ["operator_mode", "Operator mode"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setSettings((current) => ({
                      ...current,
                      preset: value as ApprovalPreset,
                    }))
                  }
                  className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition ${
                    settings.preset === value
                      ? "border-accent/40 bg-accent/10 text-accent"
                      : "border-white/8 bg-panel-strong/85 text-slate-300"
                  }`}
                >
                  <span>{label}</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em]">
                    {settings.preset === value ? "active" : "select"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/8 bg-panel/95 p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Action Overrides</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {sensitiveActionTypes.map((action) => {
                const current = settings.actionOverrides[action];
                return (
                  <div key={action} className="rounded-2xl border border-white/8 bg-panel-strong/85 p-4">
                    <p className="text-sm font-medium text-white">{action}</p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setSettings((existing) => ({
                            ...existing,
                            actionOverrides: { ...existing.actionOverrides, [action]: true },
                          }))
                        }
                        className={`rounded-full border px-3 py-2 text-xs ${
                          current === true
                            ? "border-accent/40 bg-accent/10 text-accent"
                            : "border-white/8 bg-white/5 text-slate-300"
                        }`}
                      >
                        Require approval
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setSettings((existing) => ({
                            ...existing,
                            actionOverrides: { ...existing.actionOverrides, [action]: false },
                          }))
                        }
                        className={`rounded-full border px-3 py-2 text-xs ${
                          current === false
                            ? "border-accent/40 bg-accent/10 text-accent"
                            : "border-white/8 bg-white/5 text-slate-300"
                        }`}
                      >
                        Allow direct
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setSettings((existing) => {
                            const next = { ...existing.actionOverrides };
                            delete next[action as ApprovalActionType];
                            return { ...existing, actionOverrides: next };
                          })
                        }
                        className="rounded-full border border-white/8 bg-white/5 px-3 py-2 text-xs text-slate-300"
                      >
                        Use preset
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
