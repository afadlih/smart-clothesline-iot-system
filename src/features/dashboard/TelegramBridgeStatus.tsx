"use client";

import { useEffect, useState } from "react";
import { Send, Shield, Info, AlertTriangle } from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface BridgeStatus {
  bridgeActive: boolean;
  lastSeenAt: { toMillis: () => number } | null;
  mqttConnected: boolean;
  streamState: string;
  queueBacklog: number;
}

export default function TelegramBridgeStatus() {
  const [status, setStatus] = useState<BridgeStatus | null>(null);
  const [diagnostics, setDiagnostics] = useState<{
    botConfigured: boolean;
    webhookEnabled: boolean;
    warnings: string[];
  } | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "system_settings", "telegram_bridge"), (snap) => {
      if (snap.exists()) {
        setStatus(snap.data() as BridgeStatus);
      }
    });

    const fetchDiagnostics = async () => {
      try {
        const res = await fetch("/api/telegram/diagnostics");
        const data = await res.json();
        setDiagnostics(data);
      } catch (error) {
        console.error("Failed to fetch telegram diagnostics", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDiagnostics();
    const timer = setInterval(fetchDiagnostics, 30000);

    return () => {
      unsub();
      clearInterval(timer);
    };
  }, []);

  const lastSeenStr = status?.lastSeenAt?.toMillis 
    ? new Date(status.lastSeenAt.toMillis()).toLocaleTimeString()
    : "-";
  
  const isBridgeAlive = status?.lastSeenAt?.toMillis 
    ? (Date.now() - status.lastSeenAt.toMillis()) < 10000
    : false;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300 flex items-center gap-2">
          <Send size={16} className="text-blue-500" />
          Telegram Bridge Status
        </h2>
        {isBridgeAlive ? (
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase tracking-tight">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active
          </span>
        ) : (
          <span className="text-[10px] font-bold text-slate-400 bg-slate-400/10 px-2 py-0.5 rounded-full uppercase tracking-tight">
            Inactive
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
            <p className="text-[10px] uppercase text-slate-500 font-semibold tracking-wider">Bridge Heartbeat</p>
            <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">{lastSeenStr}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
            <p className="text-[10px] uppercase text-slate-500 font-semibold tracking-wider">Queue Backlog</p>
            <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">{status?.queueBacklog ?? 0} jobs</p>
          </div>
        </div>

        {diagnostics && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 flex items-center gap-1.5"><Shield size={12} /> Bot Token</span>
              <span className={diagnostics.botConfigured ? "text-emerald-500 font-medium" : "text-red-500 font-medium"}>
                {diagnostics.botConfigured ? "Configured" : "Missing"}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 flex items-center gap-1.5"><Info size={12} /> Webhook</span>
              <span className={diagnostics.webhookEnabled ? "text-emerald-500 font-medium" : "text-amber-500 font-medium"}>
                {diagnostics.webhookEnabled ? "Enabled" : "Disabled (Polling)"}
              </span>
            </div>
            {diagnostics.warnings.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/40">
                <p className="text-[10px] uppercase text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                  <AlertTriangle size={12} /> Warnings
                </p>
                <ul className="mt-1 space-y-1">
                  {diagnostics.warnings.map((w: string, i: number) => (
                    <li key={i} className="text-[11px] text-amber-700 dark:text-amber-300 leading-tight">• {w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {!isBridgeAlive && (
        <div className="mt-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40">
          <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
            <strong>Note:</strong> Telegram commands require an active dashboard bridge. Keep at least one dashboard tab open to process commands.
          </p>
        </div>
      )}
    </div>
  );
}
