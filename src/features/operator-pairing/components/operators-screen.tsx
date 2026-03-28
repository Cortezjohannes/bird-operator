"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";

import { capabilityLabels } from "@/src/features/x-auth/capabilities";
import {
  getDefaultGrantedCapabilities,
  operatorSessionModeDescriptions,
  operatorSessionModeLabels,
  operatorSessionModeOrder,
} from "@/src/features/operator-pairing/policy";
import type {
  OperatorSessionMode,
  OperatorSessionPolicyInput,
  OperatorSessionSummary,
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

function CapabilityChecklist({
  capabilities,
  selected,
  disabled,
  onToggle,
}: Readonly<{
  capabilities: XCapability[];
  selected: XCapability[];
  disabled?: boolean;
  onToggle: (capability: XCapability, enabled: boolean) => void;
}>) {
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {capabilities.map((capability) => {
        const checked = selected.includes(capability);
        return (
          <label
            key={capability}
            className={`flex items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-sm ${
              checked
                ? "border-sky-400/30 bg-sky-400/10 text-slate-100"
                : "border-white/8 bg-white/5 text-slate-300"
            }`}
          >
            <span>{capabilityLabels[capability]}</span>
            <input
              type="checkbox"
              checked={checked}
              disabled={disabled}
              onChange={(event) => onToggle(capability, event.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-transparent"
            />
          </label>
        );
      })}
    </div>
  );
}

function ModeSelector({
  mode,
  name,
  onChange,
}: Readonly<{
  mode: OperatorSessionMode;
  name: string;
  onChange: (mode: OperatorSessionMode) => void;
}>) {
  return (
    <div className="grid gap-2">
      {operatorSessionModeOrder.map((entry) => (
        <label
          key={entry}
          className={`rounded-2xl border px-4 py-3 ${
            entry === mode
              ? "border-sky-400/30 bg-sky-400/10"
              : "border-white/8 bg-white/5"
          }`}
        >
          <div className="flex items-start gap-3">
            <input
              type="radio"
              name={name}
              checked={entry === mode}
              onChange={() => onChange(entry)}
              className="mt-1 h-4 w-4"
            />
            <div>
              <p className="text-sm font-semibold text-white">
                {operatorSessionModeLabels[entry]}
              </p>
              <p className="mt-1 text-sm text-slate-300">
                {operatorSessionModeDescriptions[entry]}
              </p>
            </div>
          </div>
        </label>
      ))}
    </div>
  );
}

function PolicyEditor({
  availableCapabilities,
  initialMode,
  initialGrantedCapabilities,
  initialApprovalRequiredCapabilities,
  onSubmit,
  submitLabel,
  pending,
}: Readonly<{
  availableCapabilities: XCapability[];
  initialMode: OperatorSessionMode;
  initialGrantedCapabilities: XCapability[];
  initialApprovalRequiredCapabilities: XCapability[];
  onSubmit: (input: OperatorSessionPolicyInput) => void;
  submitLabel: string;
  pending: boolean;
}>) {
  const modeName = useId();
  const [mode, setMode] = useState<OperatorSessionMode>(initialMode);
  const [grantedCapabilities, setGrantedCapabilities] = useState<XCapability[]>(
    initialGrantedCapabilities,
  );
  const [approvalRequiredCapabilities, setApprovalRequiredCapabilities] =
    useState<XCapability[]>(initialApprovalRequiredCapabilities);

  function updateMode(nextMode: OperatorSessionMode) {
    setMode(nextMode);
    if (nextMode === "trusted_operator") {
      setApprovalRequiredCapabilities([]);
      return;
    }

    if (nextMode === "approval_required") {
      setApprovalRequiredCapabilities(getDefaultApprovalCaps(grantedCapabilities));
    }
  }

  function updateGranted(capability: XCapability, enabled: boolean) {
    const next = toggleCapability(grantedCapabilities, capability, enabled);
    setGrantedCapabilities(next);
    if (!enabled) {
      setApprovalRequiredCapabilities((current) =>
        current.filter((entry) => entry !== capability),
      );
      return;
    }

    if (mode === "approval_required") {
      setApprovalRequiredCapabilities(getDefaultApprovalCaps(next));
    }
  }

  function applySafeDefaults() {
    const defaults = getDefaultGrantedCapabilities(availableCapabilities);
    setGrantedCapabilities(defaults);
    setApprovalRequiredCapabilities(getDefaultApprovalCaps(defaults));
    setMode("approval_required");
  }

  function grantRequestedSet() {
    setGrantedCapabilities(availableCapabilities);
    setApprovalRequiredCapabilities(getDefaultApprovalCaps(availableCapabilities));
  }

  return (
    <div className="space-y-4 rounded-2xl border border-white/8 bg-panel-strong/85 p-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={applySafeDefaults}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300"
        >
          Use safe defaults
        </button>
        <button
          type="button"
          onClick={grantRequestedSet}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300"
        >
          Grant requested set
        </button>
      </div>

      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">
          Access Mode
        </p>
        <div className="mt-3">
          <ModeSelector mode={mode} name={modeName} onChange={updateMode} />
        </div>
      </div>

      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">
          Granted Capabilities
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Trusted access is still capability-scoped. If a capability is not granted here, the
          operator cannot execute it.
        </p>
        <div className="mt-3">
          <CapabilityChecklist
            capabilities={availableCapabilities}
            selected={grantedCapabilities}
            onToggle={updateGranted}
          />
        </div>
      </div>

      {mode === "custom" ? (
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">
            Still Require Approval
          </p>
          <p className="mt-2 text-sm text-slate-400">
            These granted capabilities stay approval-gated for this session even in custom mode.
          </p>
          <div className="mt-3">
            <CapabilityChecklist
              capabilities={grantedCapabilities}
              selected={approvalRequiredCapabilities}
              onToggle={(capability, enabled) => {
                setApprovalRequiredCapabilities((current) =>
                  toggleCapability(current, capability, enabled),
                );
              }}
            />
          </div>
        </div>
      ) : null}

      {mode === "trusted_operator" ? (
        <div className="rounded-2xl border border-orange-400/20 bg-orange-400/10 px-4 py-3 text-sm text-orange-200">
          Trusted Operator Mode allows hands-free actions inside the granted scope. Revocation stays
          available at all times, and actions are still logged server-side.
        </div>
      ) : null}

      <button
        type="button"
        onClick={() =>
          onSubmit({
            mode,
            grantedCapabilities,
            approvalRequiredCapabilities:
              mode === "custom" ? approvalRequiredCapabilities : [],
          })
        }
        disabled={pending}
        className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-200"
      >
        {pending ? "Processing..." : submitLabel}
      </button>
    </div>
  );
}

function RequestCard({
  request,
  onApprove,
  onReject,
  pending,
}: Readonly<{
  request: PairingRequestSummary;
  onApprove: (id: string, input: OperatorSessionPolicyInput) => void;
  onReject: (id: string) => void;
  pending: boolean;
}>) {
  const defaultGranted = getDefaultGrantedCapabilities(request.requestedCapabilities);

  return (
    <article className="rounded-3xl border border-white/8 bg-panel/95 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-white">{request.operatorLabel}</p>
            <span className="rounded-full bg-white/5 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300">
              {request.status}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-300">
            Operator instance{" "}
            <span className="font-mono text-slate-100">{request.operatorInstanceId}</span>
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-400">
            {request.requestedScopeSummary}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {request.requestedCapabilities.map((capability) => (
              <span
                key={capability}
                className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-300"
              >
                {capabilityLabels[capability]}
              </span>
            ))}
          </div>
        </div>

        <dl className="grid gap-2 text-xs text-slate-400">
          <div>
            <dt className="font-mono uppercase tracking-[0.18em] text-slate-500">Created</dt>
            <dd>{formatTimestamp(request.createdAt)}</dd>
          </div>
          <div>
            <dt className="font-mono uppercase tracking-[0.18em] text-slate-500">Expires</dt>
            <dd>{formatTimestamp(request.expiresAt)}</dd>
          </div>
          <div>
            <dt className="font-mono uppercase tracking-[0.18em] text-slate-500">Code</dt>
            <dd>{request.oneTimeCodeDisplay}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-4 rounded-2xl border border-white/8 bg-panel-strong/85 p-3 text-sm text-slate-300">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">
          Fingerprint
        </p>
        <p className="mt-2">Host: {request.operatorFingerprint.host || "n/a"}</p>
        <p>Instance: {request.operatorFingerprint.instanceId || "n/a"}</p>
        <p>Runtime: {request.operatorFingerprint.runtime || "n/a"}</p>
        <p>IP hint: {request.operatorFingerprint.ipHint || "n/a"}</p>
        {request.operatorFingerprint.notes ? <p>Notes: {request.operatorFingerprint.notes}</p> : null}
      </div>

      {request.status === "pending" ? (
        <div className="mt-4 space-y-3">
          <PolicyEditor
            availableCapabilities={request.requestedCapabilities}
            initialMode="approval_required"
            initialGrantedCapabilities={defaultGranted}
            initialApprovalRequiredCapabilities={getDefaultApprovalCaps(defaultGranted)}
            pending={pending}
            submitLabel="Approve pairing"
            onSubmit={(input) => onApprove(request.id, input)}
          />
          <button
            type="button"
            onClick={() => onReject(request.id)}
            disabled={pending}
            className="rounded-full border border-orange-400/20 bg-orange-400/10 px-4 py-2 text-sm text-orange-200"
          >
            Reject pairing
          </button>
        </div>
      ) : null}
    </article>
  );
}

function SessionCard({
  session,
  onRevoke,
  onSave,
  onDowngrade,
  pending,
}: Readonly<{
  session: OperatorSessionSummary;
  onRevoke: (id: string) => void;
  onSave: (id: string, input: OperatorSessionPolicyInput) => void;
  onDowngrade: (id: string) => void;
  pending: boolean;
}>) {
  return (
    <article className="rounded-3xl border border-white/8 bg-panel/95 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-white">{session.operatorLabel}</p>
            <span className="rounded-full bg-white/5 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300">
              {session.status}
            </span>
            <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-sky-200">
              {operatorSessionModeLabels[session.mode]}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-300">
            Operator instance{" "}
            <span className="font-mono text-slate-100">{session.operatorInstanceId}</span>
          </p>
          <div className="mt-3">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Granted</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {session.grantedCapabilities.length > 0 ? (
                session.grantedCapabilities.map((capability) => (
                  <span
                    key={capability}
                    className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-300"
                  >
                    {capabilityLabels[capability]}
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-500">No capabilities granted.</span>
              )}
            </div>
          </div>
        </div>

        <dl className="grid gap-2 text-xs text-slate-400">
          <div>
            <dt className="font-mono uppercase tracking-[0.18em] text-slate-500">Paired</dt>
            <dd>{formatTimestamp(session.pairedAt)}</dd>
          </div>
          <div>
            <dt className="font-mono uppercase tracking-[0.18em] text-slate-500">Last seen</dt>
            <dd>{formatTimestamp(session.lastSeenAt)}</dd>
          </div>
          <div>
            <dt className="font-mono uppercase tracking-[0.18em] text-slate-500">Expires</dt>
            <dd>{formatTimestamp(session.expiresAt)}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-4 rounded-2xl border border-white/8 bg-panel-strong/85 p-3 text-sm text-slate-300">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">
          Fingerprint
        </p>
        <p className="mt-2">Host: {session.fingerprintMetadata.host || "n/a"}</p>
        <p>Instance: {session.fingerprintMetadata.instanceId || "n/a"}</p>
        <p>Runtime: {session.fingerprintMetadata.runtime || "n/a"}</p>
        <p>IP hint: {session.fingerprintMetadata.ipHint || "n/a"}</p>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
        <PolicyEditor
          availableCapabilities={session.requestedCapabilities}
          initialMode={session.mode}
          initialGrantedCapabilities={session.grantedCapabilities}
          initialApprovalRequiredCapabilities={session.approvalRequiredCapabilities}
          pending={pending}
          submitLabel="Save session policy"
          onSubmit={(input) => onSave(session.id, input)}
        />

        <div className="space-y-3 rounded-2xl border border-white/8 bg-panel-strong/85 p-4 text-sm text-slate-300">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">
              Approval-Gated
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {session.approvalRequiredCapabilities.length > 0 ? (
                session.approvalRequiredCapabilities.map((capability) => (
                  <span
                    key={capability}
                    className="rounded-full bg-orange-400/10 px-2.5 py-1 text-xs text-orange-200"
                  >
                    {capabilityLabels[capability]}
                  </span>
                ))
              ) : (
                <span className="text-slate-500">None.</span>
              )}
            </div>
          </div>

          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">
              Recent Actions
            </p>
            <div className="mt-3 space-y-2">
              {session.recentActions.length > 0 ? (
                session.recentActions.map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-white/8 bg-white/5 px-3 py-2">
                    <p className="text-xs text-slate-400">{formatTimestamp(entry.timestamp)}</p>
                    <p className="mt-1 text-sm text-slate-100">{entry.actionType}</p>
                    <p className="text-xs text-slate-400">
                      {entry.resultStatus} · {entry.executionPath || "direct"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-slate-500">No recent operator actions logged yet.</p>
              )}
            </div>
          </div>

          {session.status === "active" ? (
            <div className="flex flex-wrap gap-2">
              {session.mode !== "approval_required" ? (
                <button
                  type="button"
                  onClick={() => onDowngrade(session.id)}
                  disabled={pending}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200"
                >
                  Downgrade to Approval Mode
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => onRevoke(session.id)}
                disabled={pending}
                className="rounded-full border border-red-400/20 bg-red-400/10 px-4 py-2 text-sm text-red-200"
              >
                Revoke access
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function OperatorsScreen({
  initialRequests,
  initialSessions,
  connectedAccountLabel,
}: Readonly<{
  initialRequests: PairingRequestSummary[];
  initialSessions: OperatorSessionSummary[];
  connectedAccountLabel: string | null;
}>) {
  const router = useRouter();
  const [requests, setRequests] = useState(initialRequests);
  const [sessions, setSessions] = useState(initialSessions);
  const [code, setCode] = useState("");
  const [resolvedRequest, setResolvedRequest] = useState<PairingRequestSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function refresh() {
    router.refresh();
  }

  function resolveCode() {
    startTransition(async () => {
      setError(null);
      const response = await fetch("/api/operator-pairing/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const payload = (await response.json()) as
        | { request: PairingRequestSummary }
        | { error: { message: string } };

      if (!response.ok || !("request" in payload)) {
        setResolvedRequest(null);
        setError("error" in payload ? payload.error.message : "Unable to resolve pairing code.");
        return;
      }

      setResolvedRequest(payload.request);
    });
  }

  function approve(id: string, input: OperatorSessionPolicyInput) {
    startTransition(async () => {
      setError(null);
      const response = await fetch(`/api/operator-pairing/requests/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const payload = (await response.json()) as
        | { request: PairingRequestSummary; session: OperatorSessionSummary }
        | { error: { message: string } };

      if (!response.ok || !("request" in payload)) {
        setError("error" in payload ? payload.error.message : "Unable to approve pairing.");
        return;
      }

      setRequests((current) =>
        current.map((request) => (request.id === id ? payload.request : request)),
      );
      setSessions((current) => [payload.session, ...current.filter((entry) => entry.id !== payload.session.id)]);
      setResolvedRequest((current) => (current?.id === id ? payload.request : current));
      refresh();
    });
  }

  function reject(id: string) {
    startTransition(async () => {
      setError(null);
      const response = await fetch(`/api/operator-pairing/requests/${id}/reject`, {
        method: "POST",
      });
      const payload = (await response.json()) as
        | { request: PairingRequestSummary }
        | { error: { message: string } };

      if (!response.ok || !("request" in payload)) {
        setError("error" in payload ? payload.error.message : "Unable to reject pairing.");
        return;
      }

      setRequests((current) =>
        current.map((request) => (request.id === id ? payload.request : request)),
      );
      setResolvedRequest((current) => (current?.id === id ? payload.request : current));
      refresh();
    });
  }

  function revoke(id: string) {
    startTransition(async () => {
      setError(null);
      const response = await fetch(`/api/operator-pairing/sessions/${id}/revoke`, {
        method: "POST",
      });
      const payload = (await response.json()) as
        | { session: OperatorSessionSummary }
        | { error: { message: string } };

      if (!response.ok || !("session" in payload)) {
        setError("error" in payload ? payload.error.message : "Unable to revoke operator session.");
        return;
      }

      setSessions((current) =>
        current.map((session) => (session.id === id ? payload.session : session)),
      );
      refresh();
    });
  }

  function updatePolicy(id: string, input: OperatorSessionPolicyInput) {
    startTransition(async () => {
      setError(null);
      const response = await fetch(`/api/operator-pairing/sessions/${id}/policy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const payload = (await response.json()) as
        | { session: OperatorSessionSummary }
        | { error: { message: string } };

      if (!response.ok || !("session" in payload)) {
        setError("error" in payload ? payload.error.message : "Unable to update operator session.");
        return;
      }

      setSessions((current) =>
        current.map((session) => (session.id === id ? payload.session : session)),
      );
      refresh();
    });
  }

  function downgrade(id: string) {
    const session = sessions.find((entry) => entry.id === id);
    if (!session) {
      return;
    }

    updatePolicy(id, {
      mode: "approval_required",
      grantedCapabilities: session.grantedCapabilities,
      approvalRequiredCapabilities: getDefaultApprovalCaps(session.grantedCapabilities),
    });
  }

  const pendingRequests = requests.filter((request) => request.status === "pending");

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_32%),linear-gradient(180deg,_#07111d_0%,_#04070c_55%,_#020409_100%)] px-4 py-4 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <section className="rounded-3xl border border-border bg-panel/95 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_18px_40px_rgba(2,6,23,0.38)] backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap gap-2">
                <Link href="/" className="rounded-full border border-white/8 bg-white/5 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300">Dashboard</Link>
                <Link href="/settings/auth" className="rounded-full border border-white/8 bg-white/5 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300">X auth</Link>
                <Link href="/logs" className="rounded-full border border-white/8 bg-white/5 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300">Logs</Link>
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">Operator Pairing</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-300">
                Approval links are the primary pairing path. Short codes remain available as a backup. Trusted Operator Mode is explicit, capability-scoped, revocable, and still audited.
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-panel-strong/85 px-4 py-3 text-sm text-slate-300">
              Connected X account: <span className="text-white">{connectedAccountLabel || "not connected"}</span>
            </div>
          </div>
        </section>

        {error ? (
          <section className="rounded-2xl border border-orange-400/20 bg-orange-400/10 px-4 py-3 text-sm text-orange-200">
            {error}
          </section>
        ) : null}

        <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="grid gap-4">
            <div className="rounded-3xl border border-white/8 bg-panel/95 p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Resolve Backup Code</p>
              <p className="mt-3 text-sm text-slate-300">
                Use the short code only when the approval link cannot be opened directly.
              </p>
              <div className="mt-4 flex gap-2">
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="ABCD-1234"
                  className="w-full rounded-2xl border border-white/8 bg-panel-strong/85 px-4 py-3 text-sm text-slate-100 outline-none"
                />
                <button
                  type="button"
                  onClick={resolveCode}
                  disabled={pending}
                  className="rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent"
                >
                  Resolve
                </button>
              </div>
            </div>

            {resolvedRequest ? (
              <div className="rounded-3xl border border-white/8 bg-panel/95 p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Resolved Request</p>
                <div className="mt-4">
                  <RequestCard
                    request={resolvedRequest}
                    onApprove={approve}
                    onReject={reject}
                    pending={pending}
                  />
                </div>
              </div>
            ) : null}

            <div className="rounded-3xl border border-white/8 bg-panel/95 p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Pairing Rules</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                <li>Approval links and codes are short-lived and one-time use.</li>
                <li>Operator identity and fingerprint are shown before approval.</li>
                <li>Trusted Operator Mode still runs through server-side policy and audit logs.</li>
                <li>Revocation stays visible for all active operator sessions.</li>
              </ul>
            </div>
          </div>

          <div className="grid gap-4">
            <section className="rounded-3xl border border-white/8 bg-panel/95 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Pending Requests</p>
                  <p className="mt-2 text-sm text-slate-300">{pendingRequests.length} pending</p>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {pendingRequests.length > 0 ? pendingRequests.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    onApprove={approve}
                    onReject={reject}
                    pending={pending}
                  />
                )) : (
                  <div className="rounded-2xl border border-white/8 bg-panel-strong/85 px-4 py-4 text-sm text-slate-400">
                    No pending operator pairing requests.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-white/8 bg-panel/95 p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Active Operator Sessions</p>
              <div className="mt-4 space-y-3">
                {sessions.length > 0 ? sessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    onRevoke={revoke}
                    onSave={updatePolicy}
                    onDowngrade={downgrade}
                    pending={pending}
                  />
                )) : (
                  <div className="rounded-2xl border border-white/8 bg-panel-strong/85 px-4 py-4 text-sm text-slate-400">
                    No active operator sessions yet.
                  </div>
                )}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
