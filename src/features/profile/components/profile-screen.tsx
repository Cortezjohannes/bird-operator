"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import type { ProfileRevision } from "@/src/features/profile/types";

export function ProfileScreen({
  draft,
  applied,
  revisions,
  scopeNotice,
}: Readonly<{
  draft: ProfileRevision | null;
  applied: ProfileRevision | null;
  revisions: ProfileRevision[];
  scopeNotice: string;
}>) {
  const [name, setName] = useState(draft?.name || "");
  const [bio, setBio] = useState(draft?.bio || "");
  const [url, setUrl] = useState(draft?.url || "");
  const [location, setLocation] = useState(draft?.location || "");
  const [avatarAssetRef, setAvatarAssetRef] = useState(draft?.avatar_asset_ref || "");
  const [bannerAssetRef, setBannerAssetRef] = useState(draft?.banner_asset_ref || "");
  const [latestRevision, setLatestRevision] = useState<ProfileRevision | null>(draft);
  const [history, setHistory] = useState<ProfileRevision[]>(revisions);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function refreshFromPayload(payload: {
    revision?: ProfileRevision;
    revisions?: ProfileRevision[];
    approval?: { id: string } | null;
  }) {
    if (payload.revision) {
      setLatestRevision(payload.revision);
      setName(payload.revision.name);
      setBio(payload.revision.bio);
      setUrl(payload.revision.url);
      setLocation(payload.revision.location);
      setAvatarAssetRef(payload.revision.avatar_asset_ref || "");
      setBannerAssetRef(payload.revision.banner_asset_ref || "");
    }
    if (payload.revisions) {
      setHistory(payload.revisions);
    }
    if (payload.approval) {
      setNotice(`Approval ${payload.approval.id} created. Review it in Approvals.`);
    }
  }

  function currentPayload() {
    return {
      name,
      bio,
      url,
      location,
      avatar_asset_ref: avatarAssetRef || null,
      banner_asset_ref: bannerAssetRef || null,
    };
  }

  function saveDraft() {
    setNotice(null);
    startTransition(async () => {
      const response = await fetch("/api/profile/revisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentPayload()),
      });
      const payload = (await response.json()) as
        | { revision: ProfileRevision; revisions: ProfileRevision[] }
        | { error: { message: string } };

      if (!response.ok || !("revision" in payload)) {
        setNotice("error" in payload ? payload.error.message : "Unable to save profile draft.");
        return;
      }

      refreshFromPayload(payload);
      setNotice(`Saved profile revision ${payload.revision.id}.`);
    });
  }

  function submitForApproval() {
    if (!latestRevision) {
      setNotice("Save a profile draft first.");
      return;
    }

    setNotice(null);
    startTransition(async () => {
      const response = await fetch(`/api/profile/revisions/${latestRevision.id}/submit`, {
        method: "POST",
      });
      const payload = (await response.json()) as
        | { approval: { id: string } }
        | { error: { message: string } };

      if (!response.ok || !("approval" in payload)) {
        setNotice("error" in payload ? payload.error.message : "Unable to submit revision.");
        return;
      }

      setNotice(`Approval ${payload.approval.id} created.`);
    });
  }

  function applyChanges() {
    if (!latestRevision) {
      setNotice("Save a profile draft first.");
      return;
    }

    setNotice(null);
    startTransition(async () => {
      const response = await fetch(`/api/profile/revisions/${latestRevision.id}/apply`, {
        method: "POST",
      });
      const payload = (await response.json()) as
        | { revision: ProfileRevision; revisions: ProfileRevision[]; approval?: { id: string } | null }
        | { error: { message: string } };

      if (!response.ok || !("revision" in payload)) {
        setNotice("error" in payload ? payload.error.message : "Unable to apply revision.");
        return;
      }

      refreshFromPayload(payload);
      setNotice(
        payload.approval
          ? `Approval ${payload.approval.id} created.`
          : `Applied revision ${payload.revision.id}.`,
      );
    });
  }

  function restoreRevision(id: string) {
    startTransition(async () => {
      const response = await fetch(`/api/profile/revisions/${id}/restore`, {
        method: "POST",
      });
      const payload = (await response.json()) as
        | { revision: ProfileRevision; revisions: ProfileRevision[] }
        | { error: { message: string } };

      if (!response.ok || !("revision" in payload)) {
        setNotice("error" in payload ? payload.error.message : "Unable to restore revision.");
        return;
      }

      refreshFromPayload(payload);
      setNotice(`Restored revision ${id} into draft ${payload.revision.id}.`);
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
                <Link href="/settings/approvals" className="rounded-full border border-white/8 bg-white/5 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300">Approval settings</Link>
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">Profile Surface</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-300">{scopeNotice}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-panel-strong/85 px-4 py-3 text-xs text-slate-400">
              {pending ? "Applying profile workflow..." : "Surface only, never account security"}
            </div>
          </div>
        </section>

        {notice ? (
          <section className="rounded-2xl border border-accent/20 bg-accent/10 px-4 py-3 text-sm text-slate-100">
            {notice}
          </section>
        ) : null}

        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-white/8 bg-panel/95 p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Editor</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="grid gap-2 text-sm text-slate-300">
                <span>Display name</span>
                <input value={name} onChange={(event) => setName(event.target.value)} className="rounded-2xl border border-white/8 bg-panel-strong/85 px-3 py-2 text-slate-100 outline-none" />
              </label>
              <label className="grid gap-2 text-sm text-slate-300">
                <span>Website URL</span>
                <input value={url} onChange={(event) => setUrl(event.target.value)} className="rounded-2xl border border-white/8 bg-panel-strong/85 px-3 py-2 text-slate-100 outline-none" />
              </label>
              <label className="grid gap-2 text-sm text-slate-300 md:col-span-2">
                <span>Bio</span>
                <textarea value={bio} onChange={(event) => setBio(event.target.value)} rows={5} className="rounded-2xl border border-white/8 bg-panel-strong/85 px-3 py-3 text-slate-100 outline-none" />
              </label>
              <label className="grid gap-2 text-sm text-slate-300">
                <span>Location</span>
                <input value={location} onChange={(event) => setLocation(event.target.value)} className="rounded-2xl border border-white/8 bg-panel-strong/85 px-3 py-2 text-slate-100 outline-none" />
              </label>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="grid gap-2 text-sm text-slate-300">
                <span>Profile image asset ref</span>
                <input value={avatarAssetRef} onChange={(event) => setAvatarAssetRef(event.target.value)} className="rounded-2xl border border-white/8 bg-panel-strong/85 px-3 py-2 text-slate-100 outline-none" placeholder="existing uploaded media id" />
              </label>
              <label className="grid gap-2 text-sm text-slate-300">
                <span>Banner image asset ref</span>
                <input value={bannerAssetRef} onChange={(event) => setBannerAssetRef(event.target.value)} className="rounded-2xl border border-white/8 bg-panel-strong/85 px-3 py-2 text-slate-100 outline-none" placeholder="existing uploaded media id" />
              </label>
            </div>

            <div className="mt-3 rounded-2xl border border-white/8 bg-panel-strong/85 p-3 text-xs leading-6 text-slate-400">
              Provide an existing media id for avatar or banner updates. Sensitive local assets should remain ignored and never committed.
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" onClick={saveDraft} className="rounded-full border border-white/8 bg-white/5 px-4 py-2 text-sm text-slate-200">Save draft changes</button>
              <button type="button" onClick={submitForApproval} className="rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm text-amber-200">Submit for approval</button>
              <button type="button" onClick={applyChanges} className="rounded-full border border-accent/30 bg-accent/10 px-4 py-2 text-sm text-accent">Apply changes</button>
            </div>
          </div>

          <div className="space-y-4">
            <section className="rounded-3xl border border-white/8 bg-panel/95 p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Current preview</p>
              <div className="mt-4 overflow-hidden rounded-3xl border border-white/8 bg-panel-strong/85">
                <div className="h-24 bg-[linear-gradient(120deg,rgba(14,165,233,0.45),rgba(249,115,22,0.35),rgba(15,23,42,0.7))]" />
                <div className="px-4 pb-4">
                  <div className="-mt-7 flex h-14 w-14 items-center justify-center rounded-full border-4 border-[#09111d] bg-white/10 text-xs text-slate-200">
                    avatar
                  </div>
                  <h2 className="mt-3 text-lg font-semibold text-white">{applied?.name || latestRevision?.name || "Draft profile"}</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-300">{applied?.bio || latestRevision?.bio || "No bio yet."}</p>
                  <dl className="mt-4 space-y-2 text-sm text-slate-400">
                    <div><dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">URL</dt><dd>{applied?.url || latestRevision?.url || "None"}</dd></div>
                    <div><dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">Location</dt><dd>{applied?.location || latestRevision?.location || "None"}</dd></div>
                    <div><dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">Avatar ref</dt><dd>{applied?.avatar_asset_ref || latestRevision?.avatar_asset_ref || "None"}</dd></div>
                    <div><dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">Banner ref</dt><dd>{applied?.banner_asset_ref || latestRevision?.banner_asset_ref || "None"}</dd></div>
                  </dl>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-white/8 bg-panel/95 p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Excluded settings</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                <li>Password, email, phone, and 2FA are excluded.</li>
                <li>Billing, privacy, and security settings are excluded.</li>
                <li>This page only manages the public-facing profile surface.</li>
              </ul>
            </section>
          </div>
        </section>

        <section className="rounded-3xl border border-white/8 bg-panel/95 p-4">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Revision history</p>
            <span className="text-xs text-slate-500">{history.length} revisions</span>
          </div>
          <div className="mt-4 space-y-3">
            {history.map((revision) => (
              <article key={revision.id} className="rounded-2xl border border-white/8 bg-panel-strong/85 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{revision.name}</p>
                    <p className="mt-1 text-sm leading-7 text-slate-300">{revision.bio}</p>
                    <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">{revision.id}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {revision.applied_at ? (
                      <span className="rounded-full bg-emerald-500/12 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-300">Applied</span>
                    ) : (
                      <span className="rounded-full bg-white/5 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300">Draft</span>
                    )}
                    <button type="button" onClick={() => restoreRevision(revision.id)} className="rounded-full border border-white/8 bg-white/5 px-3 py-2 text-sm text-slate-300">
                      Restore to draft
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
