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
  lastDispatchedCommandId?: string | null;
  lastError?: string | null;
}

type Diagnostics = {
  botConfigured: boolean;
  webhookEnabled: boolean;
  runtimeMode?: "polling" | "webhook" | "unconfigured";
  latestPendingCommandsCount?: number;
  bridge?: {
    active: boolean;
    alive: boolean;
    ageMs: number | null;
    queueBacklog: number | null;
    mqttConnected: boolean | null;
    streamState: string | null;
    lastDispatchedCommandId: string | null;
    lastError: string | null;
  };
  warnings: string[];
};

export default function TelegramBridgeStatus() {
  const [status, setStatus] = useState<BridgeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "system_settings", "telegram_bridge"), (snap) => {
      if (snap.exists()) {
        setStatus(snap.data() as BridgeStatus);
      }
    });

    const fetchDiagnostics = async () => {
      try {
        const res = await fetch("/api/telegram/diagnostics");
        const data = (await res.json()) as Diagnostics;
        setDiagnostics(data);
      } catch (error) {
        console.error("Failed to fetch telegram diagnostics", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchDiagnostics();
    const timer = window.setInterval(() => {
      void fetchDiagnostics();
    }, 30000);

    return () => {
      unsub();
      window.clearInterval(timer);
    };
  }, []);

  const lastSeenMs = status?.lastSeenAt?.toMillis ? status.lastSeenAt.toMillis() : null;
  const lastSeenStr = lastSeenMs ? new Date(lastSeenMs).toLocaleTimeString() : "-";
  const localBridgeAlive = lastSeenMs ? Date.now() - lastSeenMs < 10_000 : false;
  const bridgeAlive = diagnostics?.bridge?.alive ?? localBridgeAlive;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300 flex items-center gap-2">
          <Send size={16} className="text-blue-500" />
          Telegram Bridge Status
        </h2>
        {bridgeAlive ? (
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

        {diagnostics ? (
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
                {diagnostics.webhookEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Runtime Mode</span>
              <span className="font-medium text-slate-700 dark:text-slate-200">{diagnostics.runtimeMode?.toUpperCase() ?? "-"}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Pending Queue</span>
              <span className="font-medium text-slate-700 dark:text-slate-200">{diagnostics.latestPendingCommandsCount ?? 0}</span>
            </div>
            {diagnostics.warnings.length > 0 ? (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/40">
                <p className="text-[10px] uppercase text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                  <AlertTriangle size={12} /> Warnings
                </p>
                <ul className="mt-1 space-y-1">
                  {diagnostics.warnings.map((warning, index) => (
                    <li key={index} className="text-[11px] text-amber-700 dark:text-amber-300 leading-tight">
                      - {warning}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        {loading ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">Loading diagnostics...</p>
        ) : null}
      </div>

      {!bridgeAlive ? (
        <div className="mt-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40">
          <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
            <strong>Note:</strong> Telegram commands require an active dashboard bridge. Keep at least one dashboard tab open to process commands.
          </p>
        </div>
      ) : null}

      {status?.lastError ? (
        <div className="mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40">
          <p className="text-[11px] text-red-700 dark:text-red-300 leading-relaxed">
            <strong>Bridge Error:</strong> {status.lastError}
          </p>
        </div>
      ) : null}
    </div>
  );
}
