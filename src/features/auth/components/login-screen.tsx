"use client";

import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import type { AppAuthSetupState } from "@/src/features/auth/types";

export function LoginScreen({
  setupState,
}: Readonly<{
  setupState: AppAuthSetupState;
}>) {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function signIn() {
    startTransition(async () => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = (await response.json()) as
        | { user: { email: string } }
        | { error: { message: string } };

      if (!response.ok || !("user" in payload)) {
        setError("error" in payload ? payload.error.message : "Unable to sign in.");
        return;
      }

      const next = searchParams.get("next") || "/";
      window.location.href = next;
    });
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_30%),linear-gradient(180deg,_#07111d_0%,_#04070c_55%,_#020409_100%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-3xl border border-border bg-panel/95 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_18px_40px_rgba(2,6,23,0.38)] backdrop-blur">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">X Operator Console</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">Secure operator control starts with explicit app auth.</h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
            This console now expects a real app session before anyone can inspect timelines, drafts, approvals, or future operator pairings. Remote operators will act through app-controlled policies, not through raw X credentials.
          </p>

          <div className="mt-6 grid gap-3">
            <div className="rounded-2xl border border-white/8 bg-panel-strong/85 p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">What Phase 1 Adds</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                <li>App-wide login and secure session cookies</li>
                <li>Protected dashboard and API routes</li>
                <li>Owner role foundation for future operator leases</li>
                <li>Safer deployment boundaries for a public product</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-white/8 bg-panel-strong/85 p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Next Product Steps</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                <li>Durable X OAuth connect flow with server-side token storage</li>
                <li>Operator pairing requests with one-time approval links and codes</li>
                <li>Revocable operator sessions with capability-scoped leases</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/8 bg-panel/95 p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Owner Login</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Sign in to manage the console</h2>
            </div>
            <span className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] ${
              setupState.productionReady
                ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                : setupState.configured
                ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                : "border-amber-400/20 bg-amber-400/10 text-amber-200"
            }`}>
              {setupState.productionReady
                ? "ready"
                : setupState.configured
                  ? "review config"
                  : "setup required"}
            </span>
          </div>

          {!setupState.configured ? (
            <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
              <p className="font-medium">App authentication is not configured yet.</p>
              <p className="mt-2">
                Add the missing env vars locally before this public-facing console can be used:
              </p>
              <p className="mt-3 font-mono text-xs text-amber-50">
                {setupState.missingFields.join(", ")}
              </p>
              <p className="mt-3 text-amber-50/90">
                Password hashes use the format <code className="rounded bg-black/20 px-1.5 py-0.5">scrypt$SALT$HASH</code>.
              </p>
            </div>
          ) : null}

          {setupState.configWarnings.length > 0 ? (
            <div className="mt-4 rounded-2xl border border-orange-400/20 bg-orange-400/10 p-4 text-sm text-orange-100">
              <p className="font-medium">Deployment warnings</p>
              <ul className="mt-2 space-y-2">
                {setupState.configWarnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm text-slate-300">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="rounded-2xl border border-white/8 bg-panel-strong/85 px-4 py-3 text-slate-100 outline-none ring-0"
                placeholder="owner@example.com"
                autoComplete="email"
              />
            </label>

            <label className="grid gap-2 text-sm text-slate-300">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="rounded-2xl border border-white/8 bg-panel-strong/85 px-4 py-3 text-slate-100 outline-none ring-0"
                placeholder="Enter owner password"
                autoComplete="current-password"
              />
            </label>
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl border border-orange-400/20 bg-orange-400/10 px-4 py-3 text-sm text-orange-200">
              {error}
            </div>
          ) : null}

          <button
            type="button"
            onClick={signIn}
            disabled={!setupState.configured || pending}
            className="mt-6 w-full rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm font-medium text-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Signing in..." : "Sign in as owner"}
          </button>

          <div className="mt-6 rounded-2xl border border-white/8 bg-panel-strong/85 p-4 text-sm text-slate-300">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-400">Deployment Notes</p>
            <ul className="mt-3 space-y-2">
              <li>Use a long random <code className="rounded bg-black/20 px-1.5 py-0.5">APP_SESSION_SECRET</code>.</li>
              <li>Set <code className="rounded bg-black/20 px-1.5 py-0.5">APP_BASE_URL</code> or <code className="rounded bg-black/20 px-1.5 py-0.5">APP_URL</code> for hosted callback-safe environments.</li>
              <li>Sessions are HTTP-only, same-site, and secure in production.</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
