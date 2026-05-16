"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, Shield, Bell, Activity, RefreshCcw, AlertCircle, Send } from "lucide-react";
import PageContainer from "@/components/layout/PageContainer";
import { useSystemState } from "@/hooks/useSystemState";
import { formatDateTime } from "@/utils/timeFormat";

export default function NotificationsPage() {
  const { events } = useSystemState();
  const [webhookStatus, setWebhookStatus] = useState("Unknown");
  const [auditLogs, setAuditLogs] = useState<Array<{ id: string; command: string; result: string; detail: string; timestamp: number; username?: string }>>([]);
  
  // Diagnostic fields
  const [telegramMode, setTelegramMode] = useState("Unknown");
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [webhookUrlMatch, setWebhookUrlMatch] = useState(false);
  const [botConfigured, setBotConfigured] = useState(false);
  const [defaultChatConfigured, setDefaultChatConfigured] = useState(false);
  const [allowedGroupsCount, setAllowedGroupsCount] = useState(0);
  const [appBaseUrl, setAppBaseUrl] = useState("");

  const notificationHistory = useMemo(() => events.slice(0, 15), [events]);

  const loadSetupState = async () => {
    try {
      const diagResponse = await fetch("/api/telegram/diagnostics");
      if (diagResponse.ok) {
        const data = await diagResponse.json();
        setTelegramMode(data.telegramMode || "Unknown");
        setWebhookEnabled(Boolean(data.webhookEnabled));
        setWebhookUrlMatch(Boolean(data.webhookUrlMatch));
        setBotConfigured(Boolean(data.botConfigured));
        setDefaultChatConfigured(Boolean(data.defaultChatConfigured));
        setAllowedGroupsCount(data.allowedGroupsCount || 0);
        setAppBaseUrl(data.appBaseUrl || "");
        setWebhookStatus(data.webhookStatus || "Unknown");
      }
      const setupResponse = await fetch("/api/telegram/setup");
      if (setupResponse.ok) {
        const setupData = await setupResponse.json();
        setAuditLogs(Array.isArray(setupData.auditLogs) ? setupData.auditLogs : []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    void loadSetupState();
    const timer = window.setInterval(() => {
      void loadSetupState();
    }, 15000);
    return () => window.clearInterval(timer);
  }, []);

  const handleRepair = async () => {
    try {
      await fetch("/api/telegram/webhook-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repair: true, force: false }),
      });
      await loadSetupState();
    } catch (err) {
      console.error(err);
    }
  };

  const telegramState = !botConfigured 
    ? "Awaiting Setup" 
    : !webhookEnabled 
      ? "Webhook Disabled" 
      : webhookStatus === "missing"
        ? "Webhook Missing"
        : !webhookUrlMatch 
          ? "Webhook Mismatch" 
          : "Connected";

  const stateClass =
    telegramState === "Connected"
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20";

  return (
    <main className="min-h-screen bg-[#f8fafc] dark:bg-[#020617] transition-colors duration-500 pb-20">
      <PageContainer className="space-y-8">
        {/* Header Section */}
        <header className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900/50 p-8 md:p-10 shadow-2xl shadow-teal-500/5 border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-teal-500/10 blur-[80px]" />
          <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-teal-500/5 blur-[80px]" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500 text-white shadow-lg shadow-teal-500/20">
                  <Bell className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-[0.25em] text-teal-600 dark:text-teal-400">
                  Notification Hub
                </span>
              </div>
              <h1 className="text-5xl md:text-6xl font-black text-slate-800 dark:text-white tracking-tighter">System Alerts</h1>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Telegram integration, event delivery logs, and notification status.</p>
            </div>

            <div className="flex items-center gap-4">
                <div className={`px-6 py-3 rounded-2xl flex items-center gap-3 font-black text-xs tracking-widest ${stateClass}`}>
                   <Bot className="h-4 w-4" />
                   {telegramState.toUpperCase()}
                </div>
                <button onClick={loadSetupState} className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200/50 dark:border-white/5 shadow-sm hover:bg-slate-50 dark:hover:bg-white/10 transition-all active:scale-95">
                   <RefreshCcw className="h-5 w-5 text-slate-500" />
                </button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Main Content Area */}
          <div className="space-y-8 lg:col-span-7">
            
            <section className="rounded-[2.5rem] bg-white dark:bg-slate-900/40 p-10 shadow-xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-10">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                  <Activity className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Audit Trail</h2>
              </div>

              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {auditLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 opacity-30">
                    <Activity className="h-12 w-12 mb-4 text-teal-500" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-center">No Delivery Records Found</p>
                  </div>
                ) : (
                  auditLogs.map((log) => (
                    <div key={log.id} className="p-6 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 group hover:border-teal-500/30 transition-all">
                       <div className="flex items-center justify-between mb-3">
                          <p className="text-base font-black text-slate-800 dark:text-white tracking-tight">{log.command === 'AUTO_REPLY' ? 'Inbound Tracking' : log.command}</p>
                          <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${log.result === 'success' || log.result === 'acknowledged' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                            {log.result}
                          </span>
                       </div>
                       <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3">{log.detail}</p>
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">{formatDateTime(log.timestamp)}</p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* Sidebar Area */}
          <aside className="space-y-8 lg:col-span-5">
            <section className="rounded-[2.5rem] bg-white dark:bg-slate-900/40 p-10 shadow-xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">Diagnostics</h2>
                </div>
                <button onClick={() => handleRepair()} className="text-[10px] font-black text-teal-600 hover:text-teal-700 uppercase tracking-widest transition-colors">Sync</button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                 <DiagRow label="Integration" value={telegramMode.toUpperCase()} active={telegramMode === 'notification-only'} />
                 <DiagRow label="Bot Config" value={botConfigured ? "VALID" : "MISSING"} active={botConfigured} />
                 <DiagRow label="Default Chat" value={defaultChatConfigured ? "ACTIVE" : "MISSING"} active={defaultChatConfigured} />
                 <DiagRow label="Webhook" value={webhookUrlMatch ? "MATCH" : "MISMATCH"} active={webhookUrlMatch} />
                 <DiagRow label="Groups" value={`${allowedGroupsCount} AUTHORIZED`} active={allowedGroupsCount > 0} />
              </div>
              
              <div className="mt-8 pt-8 border-t border-slate-100 dark:border-white/5 space-y-4">
                 <div className="p-5 rounded-2xl bg-slate-900 text-[10px] font-mono text-slate-400 overflow-hidden shadow-inner">
                    <p className="mb-2 text-teal-500">{"// ENDPOINT"}</p>
                    <p className="truncate opacity-80">{appBaseUrl || "Not set"}</p>
                 </div>
              </div>
            </section>

            <section className="rounded-[2.5rem] bg-white dark:bg-slate-900/40 p-10 shadow-xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-10">
                  <Send className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">Live Feed</h2>
                </div>
                <div className="space-y-6">
                   {notificationHistory.length === 0 ? (
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center py-10 opacity-30">No Recent Events</p>
                   ) : (
                     notificationHistory.map((item, index) => (
                       <div key={index} className="flex gap-6 group">
                          <div className="flex flex-col items-center">
                             <div className={`h-2.5 w-2.5 rounded-full ${item.action.toLowerCase().includes('fail') ? 'bg-rose-500' : 'bg-teal-500'} shadow-[0_0_12px_rgba(20,184,166,0.3)] transition-all group-hover:scale-125`} />
                             {index < notificationHistory.length - 1 && <div className="h-full w-px bg-slate-200 dark:bg-white/10 mt-2" />}
                          </div>
                           <div className="pb-6">
                             <p className="text-xs font-black text-slate-800 dark:text-white leading-none mb-2 uppercase tracking-tight">{item.action}</p>
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{formatDateTime(item.timestamp)}</p>
                          </div>
                       </div>
                     ))
                   )}
                </div>
            </section>

            <div className="p-10 rounded-[2.5rem] bg-teal-600 text-white shadow-2xl shadow-teal-600/20 relative overflow-hidden group">
                <div className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-white/10 blur-3xl group-hover:scale-110 transition-transform duration-700" />
                <div className="relative z-10">
                   <AlertCircle className="h-10 w-10 mb-6 opacity-40" />
                   <h3 className="text-2xl font-black mb-3">System Design</h3>
                   <p className="text-sm font-medium opacity-90 leading-relaxed">
                     This integration is strictly <strong>unidirectional</strong>. 
                     The system pushes operational alerts to Telegram, but does not process incoming commands.
                   </p>
                </div>
            </div>
          </aside>
        </div>
      </PageContainer>
    </main>
  );
}

function DiagRow({ label, value, active }: { label: string; value: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between p-6 rounded-[2rem] bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 group hover:border-teal-500/30 transition-all">
       <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-teal-600 transition-colors">{label}</span>
       <span className={`text-[10px] font-black uppercase tracking-widest ${active ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>{value}</span>
    </div>
  );
}
