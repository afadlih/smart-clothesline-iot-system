"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, Command, Shield, Bell, Terminal, Activity, ChevronRight, RefreshCcw, AlertCircle } from "lucide-react";
import PageContainer from "@/components/layout/PageContainer";
import { useSystemState } from "@/hooks/useSystemState";
import { formatDateTime } from "@/utils/timeFormat";

const commandItems = [
  { cmd: "/status", purpose: "Get current clothesline status", permission: "Operator" },
  { cmd: "/open", purpose: "Open clothesline remotely", permission: "Operator" },
  { cmd: "/close", purpose: "Close clothesline remotely", permission: "Operator" },
  { cmd: "/mode_auto", purpose: "Switch mode to Auto", permission: "Operator" },
  { cmd: "/mode_manual", purpose: "Switch mode to Manual", permission: "Operator" },
  { cmd: "/latest", purpose: "Read latest sensor summary", permission: "Viewer" },
  { cmd: "/health", purpose: "Check device health", permission: "Viewer" },
  { cmd: "/restart", purpose: "Restart device", permission: "Admin" },
];

export default function NotificationsPage() {
  const { smartAlerts, events } = useSystemState();
  const [webhookStatus, setWebhookStatus] = useState("Unknown");
  const [commandRegistration, setCommandRegistration] = useState("Unknown");
  const [pollingStatus, setPollingStatus] = useState("stopped");
  const [auditLogs, setAuditLogs] = useState<Array<{ id: string; command: string; result: string; detail: string; timestamp: number; username?: string }>>([]);
  
  // Diagnostic fields
  const [runtimeMode, setRuntimeMode] = useState("Unknown");
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [webhookUrlMatch, setWebhookUrlMatch] = useState(false);
  const [botConfigured, setBotConfigured] = useState(false);
  const [allowedUserIdsCount, setAllowedUserIdsCount] = useState(0);
  const [bridgeAlive, setBridgeAlive] = useState(false);
  const [expectedWebhookUrl, setExpectedWebhookUrl] = useState("");
  const [appBaseUrl, setAppBaseUrl] = useState("");
  const [isRepairing, setIsRepairing] = useState(false);

  const notificationHistory = useMemo(() => events.slice(0, 15), [events]);

  const loadSetupState = async () => {
    try {
      const diagResponse = await fetch("/api/telegram/diagnostics");
      if (diagResponse.ok) {
        const data = await diagResponse.json();
        setRuntimeMode(data.runtimeMode || "Unknown");
        setWebhookEnabled(Boolean(data.webhookEnabled));
        setWebhookUrlMatch(Boolean(data.webhookUrlMatch));
        setBotConfigured(Boolean(data.botConfigured));
        setAllowedUserIdsCount(data.allowedUserIdsCount || 0);
        setBridgeAlive(Boolean(data.bridgeAlive));
        setExpectedWebhookUrl(data.expectedWebhookUrl || "");
        setAppBaseUrl(data.appBaseUrl || "");
        setWebhookStatus(data.webhookStatus || "Unknown");
        setPollingStatus(data.polling?.status ?? "stopped");
        setCommandRegistration(data.botInfo ? "Registered" : "Pending");
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

  const handleRepair = async (force: boolean = false) => {
    setIsRepairing(true);
    try {
      await fetch("/api/telegram/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "webhook", repair: true, force }),
      });
      await loadSetupState();
    } catch (err) {
      console.error(err);
    } finally {
      setIsRepairing(false);
    }
  };

  const telegramState = !botConfigured 
    ? "Awaiting Setup" 
    : runtimeMode === "polling"
      ? "Polling Active"
      : !webhookEnabled 
        ? "Webhook Disabled" 
        : webhookStatus === "missing"
          ? "Webhook Missing"
          : !webhookUrlMatch 
            ? "Webhook Mismatch" 
            : "Connected";

  const stateClass =
    telegramState === "Connected" || telegramState === "Polling Active"
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20";

  return (
    <main className="min-h-screen bg-[#f8fafc] dark:bg-[#020617] transition-colors duration-500 pb-20">
      <PageContainer className="space-y-8">
        {/* Header Section */}
        <header className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900/50 p-8 md:p-10 shadow-2xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-teal-500/10 blur-[80px]" />
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
              <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">System Alerts</h1>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Telegram integration, audit trails, and command protocols.</p>
            </div>

            <div className="flex items-center gap-4">
                <div className={`px-5 py-2.5 rounded-2xl flex items-center gap-3 font-black text-xs tracking-widest ${stateClass}`}>
                   <Bot className="h-4 w-4" />
                   {telegramState.toUpperCase()}
                </div>
                <button onClick={loadSetupState} className="p-3 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 shadow-sm hover:bg-slate-50 dark:hover:bg-white/10 transition-colors">
                  <RefreshCcw className="h-4 w-4 text-slate-500" />
                </button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Main Content Area */}
          <div className="space-y-8 lg:col-span-7">
            
            <section className="rounded-[2rem] bg-white dark:bg-slate-900/40 p-8 shadow-xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                  <Terminal className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">Telegram Command Protocol</h2>
              </div>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {commandItems.map((item) => (
                  <div key={item.cmd} className="group p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 hover:border-teal-500/30 transition-all">
                    <div className="flex items-center justify-between mb-2">
                       <code className="text-sm font-black text-teal-600 dark:text-teal-400">{item.cmd}</code>
                       <span className="text-[9px] font-black px-2 py-0.5 bg-slate-200 dark:bg-white/10 rounded-full text-slate-500 uppercase tracking-widest">{item.permission}</span>
                    </div>
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300 leading-relaxed">{item.purpose}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[2rem] bg-white dark:bg-slate-900/40 p-8 shadow-xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                  <Activity className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">Audit Trail</h2>
              </div>

              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {auditLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 opacity-30">
                    <Terminal className="h-10 w-10 mb-2" />
                    <p className="text-xs font-bold uppercase tracking-widest text-center">No audit logs</p>
                  </div>
                ) : (
                  auditLogs.map((log) => (
                    <div key={log.id} className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5">
                       <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-black text-slate-800 dark:text-white tracking-tight">{log.command}</p>
                          <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${log.result === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                            {log.result}
                          </span>
                       </div>
                       <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">{log.detail}</p>
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{formatDateTime(log.timestamp)}</p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* Sidebar Area */}
          <aside className="space-y-8 lg:col-span-5">
            <section className="rounded-[2rem] bg-white dark:bg-slate-900/40 p-8 shadow-xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">Diagnostics</h2>
                </div>
                <button onClick={() => handleRepair()} className="text-[10px] font-black text-teal-600 hover:text-teal-700 uppercase tracking-widest">Repair</button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                 <DiagRow label="Bot Config" value={botConfigured ? "VALID" : "MISSING"} active={botConfigured} />
                 <DiagRow label="Bridge Status" value={bridgeAlive ? "ALIVE" : "DEAD"} active={bridgeAlive} />
                 <DiagRow label="Webhook" value={webhookUrlMatch ? "MATCH" : "MISMATCH"} active={webhookUrlMatch} />
                 <DiagRow label="Users" value={`${allowedUserIdsCount} REGISTERED`} active={allowedUserIdsCount > 0} />
              </div>
              
              <div className="mt-6 pt-6 border-t border-slate-100 dark:border-white/5 space-y-4">
                 <div className="p-4 rounded-xl bg-slate-900 text-[10px] font-mono text-slate-400 overflow-hidden">
                    <p className="mb-1 text-teal-500">// ENDPOINT</p>
                    <p className="truncate">{appBaseUrl || "Not set"}</p>
                 </div>
              </div>
            </section>

            <section className="rounded-[2rem] bg-white dark:bg-slate-900/40 p-8 shadow-xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-6">
                  <History className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">Notification History</h2>
                </div>
                <div className="space-y-4">
                   {notificationHistory.length === 0 ? (
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center py-6">Empty stream</p>
                   ) : (
                     notificationHistory.map((item, index) => (
                       <div key={index} className="flex gap-4">
                          <div className="flex flex-col items-center">
                             <div className={`h-2 w-2 rounded-full ${item.action.toLowerCase().includes('fail') ? 'bg-rose-500' : 'bg-teal-500'} shadow-[0_0_8px_rgba(20,184,166,0.3)]`} />
                             {index < notificationHistory.length - 1 && <div className="h-full w-px bg-slate-200 dark:bg-white/10 mt-1" />}
                          </div>
                          <div className="pb-4">
                             <p className="text-xs font-bold text-slate-800 dark:text-white leading-none mb-1">{item.action}</p>
                             <p className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 uppercase">{formatDateTime(item.timestamp)}</p>
                          </div>
                       </div>
                     ))
                   )}
                </div>
            </section>

            <div className="p-8 rounded-[2rem] bg-teal-600 text-white shadow-xl shadow-teal-600/20 relative overflow-hidden">
                <div className="absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                <div className="relative z-10">
                   <AlertCircle className="h-8 w-8 mb-4 opacity-50" />
                   <h3 className="text-xl font-black mb-2">Protocol Insight</h3>
                   <p className="text-sm font-medium opacity-90 leading-relaxed">
                     Outbound notifications function independently of command webhooks. 
                     If /open fails, check Webhook Diagnostics.
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
    <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5">
       <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
       <span className={`text-[10px] font-black uppercase tracking-widest ${active ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>{value}</span>
    </div>
  );
}

function History({ className }: { className?: string }) {
  return <RefreshCcw className={className} />;
}

