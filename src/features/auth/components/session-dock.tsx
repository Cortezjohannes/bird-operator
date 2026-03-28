"use client";

import { usePathname } from "next/navigation";
import { useTransition } from "react";

import type { AppSessionUser } from "@/src/features/auth/types";

export function SessionDock({
  user,
}: Readonly<{
  user: AppSessionUser | null;
}>) {
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  if (!user || pathname === "/login") {
    return null;
  }

  function signOut() {
    startTransition(async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    });
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-white/8 bg-slate-950/90 px-4 py-2 shadow-[0_18px_40px_rgba(2,6,23,0.38)] backdrop-blur">
        <div className="text-right">
          <p className="text-xs font-medium text-white">{user.email}</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">{user.role}</p>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="rounded-full border border-white/8 bg-white/5 px-3 py-1 text-xs text-slate-300"
        >
          {pending ? "..." : "Sign out"}
        </button>
      </div>
    </div>
  );
}
