"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Activity } from "lucide-react";

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
    <main className="min-h-screen bg-[#f8fafc] dark:bg-[#020617] flex items-center justify-center p-6">
      <div className="relative w-full max-w-lg">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-rose-500/10 blur-[80px]" />
        
        <section className="relative z-10 rounded-[2.5rem] bg-white dark:bg-slate-900/50 p-10 shadow-2xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm overflow-hidden text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-lg shadow-rose-500/20 mx-auto mb-8">
             <AlertTriangle size={32} />
          </div>

          <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight mb-2">
             Operational UI Interruption
          </h1>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed mb-6">
             The workspace encountered an exception while rendering. Backend services and automatic logic are unaffected.
          </p>

          <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10 text-left mb-8">
             <div className="flex items-center gap-2 mb-2">
                <Activity size={12} className="text-rose-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">Trace Logs</span>
             </div>
             <p className="text-[11px] font-mono font-bold text-rose-600 dark:text-rose-400 break-words">
                {error.message || "Unknown rendering exception"}
             </p>
          </div>

          <button
            type="button"
            onClick={reset}
            className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl bg-slate-900 dark:bg-emerald-600 text-white font-black text-xs tracking-widest transition-all active:scale-95 shadow-xl shadow-emerald-600/10 hover:opacity-90"
          >
             <RefreshCw size={16} /> ATTEMPT HOT-RELOAD
          </button>

          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/5">
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Smart Core v1.0.4 // Error Handled</p>
          </div>
        </section>
      </div>
    </main>
  );
}


