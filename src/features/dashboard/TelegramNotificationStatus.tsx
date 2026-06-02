"use client";

import { useEffect, useState } from "react";
import { Send, Shield, Bell, CheckCircle, XCircle } from "lucide-react";

type Diagnostics = {
  ok: boolean;
  telegramMode: string;
  botConfigured: boolean;
  defaultChatConfigured: boolean;
  outboundNotificationsCanWork: boolean;
  webhookEnabled: boolean;
  webhookUrlMatch: boolean;
  groupNotificationsEnabled: boolean;
  allowedGroupsCount: number;
  warnings: string[];
};

export default function TelegramNotificationStatus() {
  const [loading, setLoading] = useState(true);
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);

  useEffect(() => {
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
      window.clearInterval(timer);
    };
  }, []);

  const isReady = diagnostics?.outboundNotificationsCanWork && diagnostics?.webhookEnabled;

  return (
    <div className="rounded-[2rem] border border-slate-200/60 bg-white p-6 shadow-xl dark:border-white/5 dark:bg-slate-900/40 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <Send size={14} className="text-teal-500" />
          Telegram Notification
        </h2>
        {isReady ? (
          <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full uppercase tracking-widest border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Ready
          </span>
        ) : (
          <span className="text-[10px] font-black text-rose-500 bg-rose-500/10 px-3 py-1 rounded-full uppercase tracking-widest border border-rose-500/20">
            Issues Detected
          </span>
        )}
      </div>

      <div className="mt-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5">
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1">Mode</p>
            <p className="text-xs font-black text-slate-800 dark:text-white uppercase">Notification Only</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5">
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1">Groups</p>
            <p className="text-xs font-black text-slate-800 dark:text-white uppercase">{diagnostics?.allowedGroupsCount ?? 0} Active</p>
          </div>
        </div>

        {diagnostics ? (
          <div className="space-y-3">
            <StatusRow 
              label="Bot Status" 
              active={diagnostics.botConfigured} 
              icon={<Shield size={12} />} 
              successLabel="Configured" 
              errorLabel="Missing Token" 
            />
            <StatusRow 
              label="Default Chat" 
              active={diagnostics.defaultChatConfigured} 
              icon={<Bell size={12} />} 
              successLabel="Active" 
              errorLabel="Missing ID" 
            />
            <StatusRow 
              label="Webhook" 
              active={diagnostics.webhookEnabled} 
              icon={<Send size={12} />} 
              successLabel="Enabled" 
              errorLabel="Disabled" 
            />

            {diagnostics.warnings.length > 0 ? (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                <p className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-widest mb-2">Warnings</p>
                <ul className="space-y-1">
                  {diagnostics.warnings.map((warning, index) => (
                    <li key={index} className="text-[10px] font-bold text-amber-700 dark:text-amber-300 leading-tight">
                      • {warning}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : loading ? (
          <div className="flex items-center gap-2 py-4 justify-center">
            <div className="h-4 w-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fetching Diagnostics</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StatusRow({ label, active, icon, successLabel, errorLabel }: { 
  label: string; 
  active: boolean; 
  icon: React.ReactNode; 
  successLabel: string; 
  errorLabel: string; 
}) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5">
      <div className="flex items-center gap-3">
        <div className="text-slate-400">{icon}</div>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        {active ? (
          <>
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{successLabel}</span>
            <CheckCircle size={12} className="text-emerald-500" />
          </>
        ) : (
          <>
            <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{errorLabel}</span>
            <XCircle size={12} className="text-rose-500" />
          </>
        )}
      </div>
    </div>
  );
}
