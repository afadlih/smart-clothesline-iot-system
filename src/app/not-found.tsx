import Link from "next/link";
import { AlertCircle, ArrowLeft, Terminal } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#f8fafc] dark:bg-[#020617] flex items-center justify-center p-6">
      <div className="relative w-full max-w-2xl">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-rose-500/10 blur-[80px]" />
        <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-teal-500/10 blur-[80px]" />
        
        <section className="relative z-10 rounded-[2.5rem] bg-white dark:bg-slate-900/50 p-12 shadow-2xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm overflow-hidden text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-rose-500 text-white shadow-lg shadow-rose-500/20 mx-auto mb-8">
             <AlertCircle size={40} />
          </div>

          <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 mb-4 border border-rose-500/20">
             SYSTEM ERROR 404
          </div>

          <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight mb-4">
             Resource Missing
          </h1>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
             The requested operational endpoint could not be resolved. It may have been decommissioned or the path was incorrectly addressed.
          </p>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
             <Link
                href="/"
                className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-slate-900 dark:bg-teal-600 text-white font-black text-xs tracking-widest transition-all active:scale-95 shadow-xl shadow-teal-600/10 hover:opacity-90"
             >
                <ArrowLeft size={16} /> RETURN TO BRIDGE
             </Link>
             <Link
                href="/sensor"
                className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300 font-black text-xs tracking-widest transition-all active:scale-95 shadow-sm hover:bg-slate-50 dark:hover:bg-white/10"
             >
                <Terminal size={16} /> DEBUG CONSOLE
             </Link>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-100 dark:border-white/5">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Smart Core v1.0.4 // Connection Secure</p>
          </div>
        </section>
      </div>
    </main>
  );
}

