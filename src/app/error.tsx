"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[UI ERROR]", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6 dark:bg-slate-950">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Operational UI Error</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          The workspace failed to render part of the content. Realtime services remain running.
        </p>
        <p className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {error.message || "Unknown error"}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Retry Render
        </button>
      </div>
    </main>
  );
}

