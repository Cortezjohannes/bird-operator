"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { capabilityLabels } from "@/src/features/x-auth/capabilities";
import {
  getDefaultGrantedCapabilities,
  operatorSessionModeDescriptions,
  operatorSessionModeLabels,
  operatorSessionModeOrder,
} from "@/src/features/operator-pairing/policy";
import type {
  OperatorSessionMode,
  PairingRequestSummary,
} from "@/src/features/operator-pairing/types";
import type { XCapability } from "@/src/features/x-auth/types";

function formatTimestamp(value: string | null) {
  if (!value) {
    return "n/a";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getDefaultApprovalCaps(grantedCapabilities: XCapability[]) {
  return grantedCapabilities.filter((capability) => {
    return (
      capability === "post_tweet" ||
      capability === "reply_tweet" ||
      capability === "quote_tweet" ||
      capability === "follow_user" ||
      capability === "update_profile_text" ||
      capability === "update_profile_media"
    );
  });
}

function toggleCapability(
  current: XCapability[],
  capability: XCapability,
  enabled: boolean,
) {
  if (enabled) {
    return current.includes(capability) ? current : [...current, capability];
  }

  return current.filter((entry) => entry !== capability);
}

export function PairingApprovalScreen({
  request,
  connectedAccountLabel,
}: Readonly<{
  request: PairingRequestSummary | null;
  connectedAccountLabel: string | null;
}>) {
  const router = useRouter();
  const defaultGranted = request ? getDefaultGrantedCapabilities(request.requestedCapabilities) : [];
  const [mode, setMode] = useState<OperatorSessionMode>("approval_required");
  const [grantedCapabilities, setGrantedCapabilities] =
    useState<XCapability[]>(defaultGranted);
  const [approvalRequiredCapabilities, setApprovalRequiredCapabilities] =
    useState<XCapability[]>(getDefaultApprovalCaps(defaultGranted));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function approve() {
    if (!request) {
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/operator-pairing/requests/${request.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          grantedCapabilities,
          approvalRequiredCapabilities:
            mode === "custom" ? approvalRequiredCapabilities : [],
        }),
      });
      const payload = (await response.json()) as
        | { request: PairingRequestSummary }
        | { error: { message: string } };

      if (!response.ok) {
        setError("error" in payload ? payload.error.message : "Unable to approve pairing.");
        return;
      }

      router.push("/settings/operators");
      router.refresh();
    });
  }

  function reject() {
    if (!request) {
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/operator-pairing/requests/${request.id}/reject`, {
        method: "POST",
      });
      const payload = (await response.json()) as
        | { request: PairingRequestSummary }
        | { error: { message: string } };

      if (!response.ok) {
        setError("error" in payload ? payload.error.message : "Unable to reject pairing.");
        return;
      }

      router.push("/settings/operators");
      router.refresh();
    });
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_32%),linear-gradient(180deg,_#07111d_0%,_#04070c_55%,_#020409_100%)] px-4 py-4 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <section className="rounded-3xl border border-border bg-panel/95 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_18px_40px_rgba(2,6,23,0.38)] backdrop-blur">
          <div className="flex flex-wrap gap-2">
            <Link href="/" className="rounded-full border border-white/8 bg-white/5 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300">Dashboard</Link>
            <Link href="/settings/operators" className="rounded-full border border-white/8 bg-white/5 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300">Operators</Link>
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">Approve Operator Pairing</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">
            Review the operator identity, requested access, and session mode before pairing. Trusted Operator Mode is explicit, capability-scoped, and fully revocable.
          </p>
        </section>

        {error ? (
          <section className="rounded-2xl border border-orange-400/20 bg-orange-400/10 px-4 py-3 text-sm text-orange-200">
            {error}
          </section>
        ) : null}

        {!request ? (
          <section className="rounded-3xl border border-white/8 bg-panel/95 p-6 text-sm text-slate-300">
            This approval link is invalid, expired, or has already been used.
          </section>
        ) : (
          <section className="rounded-3xl border border-white/8 bg-panel/95 p-6">
            <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/8 bg-panel-strong/85 p-4">
                  <p className="text-lg font-semibold text-white">{request.operatorLabel}</p>
                  <p className="mt-1 text-sm text-slate-300">
                    Operator instance <span className="font-mono text-slate-100">{request.operatorInstanceId}</span>
                  </p>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{request.requestedScopeSummary}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {request.requestedCapabilities.map((capability) => (
                      <span key={capability} className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-300">
                        {capabilityLabels[capability]}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/8 bg-panel-strong/85 p-4 text-sm text-slate-300">
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">Fingerprint</p>
                  <p className="mt-2">Host: {request.operatorFingerprint.host || "n/a"}</p>
                  <p>Instance: {request.operatorFingerprint.instanceId || "n/a"}</p>
                  <p>Runtime: {request.operatorFingerprint.runtime || "n/a"}</p>
                  <p>IP hint: {request.operatorFingerprint.ipHint || "n/a"}</p>
                  {request.operatorFingerprint.notes ? <p>Notes: {request.operatorFingerprint.notes}</p> : null}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-white/8 bg-panel-strong/85 p-4 text-sm text-slate-300">
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">Approval Context</p>
                  <p className="mt-2">Connected X account: <span className="text-white">{connectedAccountLabel || "not connected"}</span></p>
                  <p>Created: {formatTimestamp(request.createdAt)}</p>
                  <p>Expires: {formatTimestamp(request.expiresAt)}</p>
                  <p>Backup code: {request.oneTimeCodeDisplay}</p>
                </div>

                <div className="rounded-2xl border border-white/8 bg-panel-strong/85 p-4 text-sm text-slate-300">
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">Mode Choice</p>
                  <div className="mt-3 space-y-2">
                    {operatorSessionModeOrder.map((entry) => (
                      <label
                        key={entry}
                        className={`block rounded-2xl border px-4 py-3 ${
                          entry === mode ? "border-sky-400/30 bg-sky-400/10" : "border-white/8 bg-white/5"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            name="pairing-approval-mode"
                            checked={entry === mode}
                            onChange={() => {
                              setMode(entry);
                              if (entry === "trusted_operator") {
                                setApprovalRequiredCapabilities([]);
                              }
                              if (entry === "approval_required") {
                                setApprovalRequiredCapabilities(getDefaultApprovalCaps(grantedCapabilities));
                              }
                            }}
                            className="mt-1 h-4 w-4"
                          />
                          <div>
                            <p className="text-sm font-semibold text-white">{operatorSessionModeLabels[entry]}</p>
                            <p className="mt-1 text-sm text-slate-300">{operatorSessionModeDescriptions[entry]}</p>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
              <div className="rounded-2xl border border-white/8 bg-panel-strong/85 p-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const defaults = getDefaultGrantedCapabilities(request.requestedCapabilities);
                      setGrantedCapabilities(defaults);
                      setApprovalRequiredCapabilities(getDefaultApprovalCaps(defaults));
                      setMode("approval_required");
                    }}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300"
                  >
                    Use safe defaults
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGrantedCapabilities(request.requestedCapabilities);
                      setApprovalRequiredCapabilities(getDefaultApprovalCaps(request.requestedCapabilities));
                    }}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300"
                  >
                    Grant requested set
                  </button>
                </div>

                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">Granted Capabilities</p>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {request.requestedCapabilities.map((capability) => (
                    <label
                      key={capability}
                      className={`flex items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-sm ${
                        grantedCapabilities.includes(capability)
                          ? "border-sky-400/30 bg-sky-400/10 text-slate-100"
                          : "border-white/8 bg-white/5 text-slate-300"
                      }`}
                    >
                      <span>{capabilityLabels[capability]}</span>
                      <input
                        type="checkbox"
                        checked={grantedCapabilities.includes(capability)}
                        onChange={(event) => {
                          const next = toggleCapability(grantedCapabilities, capability, event.target.checked);
                          setGrantedCapabilities(next);
                          if (!event.target.checked) {
                            setApprovalRequiredCapabilities((current) =>
                              current.filter((entry) => entry !== capability),
                            );
                          }
                        }}
                        className="h-4 w-4"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-panel-strong/85 p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">Safety</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  <li>No raw X credentials are shared with the operator.</li>
                  <li>Approval activates an app-controlled operator session only.</li>
                  <li>Revoke remains available afterward from the operators page.</li>
                </ul>

                {mode === "custom" ? (
                  <>
                    <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">Still Require Approval</p>
                    <div className="mt-3 space-y-2">
                      {grantedCapabilities.map((capability) => (
                        <label
                          key={capability}
                          className={`flex items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-sm ${
                            approvalRequiredCapabilities.includes(capability)
                              ? "border-orange-400/20 bg-orange-400/10 text-orange-100"
                              : "border-white/8 bg-white/5 text-slate-300"
                          }`}
                        >
                          <span>{capabilityLabels[capability]}</span>
                          <input
                            type="checkbox"
                            checked={approvalRequiredCapabilities.includes(capability)}
                            onChange={(event) => {
                              setApprovalRequiredCapabilities((current) =>
                                toggleCapability(current, capability, event.target.checked),
                              );
                            }}
                            className="h-4 w-4"
                          />
                        </label>
                      ))}
                    </div>
                  </>
                ) : null}

                {mode === "trusted_operator" ? (
                  <div className="mt-4 rounded-2xl border border-orange-400/20 bg-orange-400/10 px-4 py-3 text-sm text-orange-200">
                    Trusted Operator Mode allows hands-free actions within the granted capability set.
                    Revocation and audit logging remain active.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={approve}
                disabled={pending}
                className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-200"
              >
                {pending ? "Processing..." : "Approve pairing"}
              </button>
              <button
                type="button"
                onClick={reject}
                disabled={pending}
                className="rounded-full border border-orange-400/20 bg-orange-400/10 px-4 py-2 text-sm text-orange-200"
              >
                Reject pairing
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
