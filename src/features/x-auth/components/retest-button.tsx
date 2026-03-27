"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function RetestButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const response = await fetch("/api/auth/retest", { method: "POST" });
            if (!response.ok) {
              setError("Retest failed. Check server logs for sanitized diagnostics.");
              return;
            }
            router.refresh();
          });
        }}
        className="rounded-full border border-accent/30 bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition hover:border-accent/60 hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={pending}
      >
        {pending ? "Retesting..." : "Retest capabilities"}
      </button>
      {error ? <p className="text-xs text-orange-300">{error}</p> : null}
    </div>
  );
}
