"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function XConnectionControls({
  connected,
}: Readonly<{
  connected: boolean;
}>) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function disconnect() {
    startTransition(async () => {
      setError(null);
      const response = await fetch("/api/x/disconnect", { method: "POST" });
      if (!response.ok) {
        setError("Unable to disconnect the X account.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <a
        href="/api/x/connect"
        className="rounded-full border border-accent/30 bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition hover:border-accent/60 hover:bg-accent/20"
      >
        {connected ? "Reconnect X" : "Connect X"}
      </a>
      {connected ? (
        <button
          type="button"
          onClick={disconnect}
          disabled={pending}
          className="rounded-full border border-white/8 bg-white/5 px-4 py-2 text-sm text-slate-300"
        >
          {pending ? "Disconnecting..." : "Disconnect X"}
        </button>
      ) : null}
      {error ? <p className="text-xs text-orange-300">{error}</p> : null}
    </div>
  );
}
