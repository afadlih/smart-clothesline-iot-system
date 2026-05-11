"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, Command, Shield } from "lucide-react";
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
  const [directMqttConfigured, setDirectMqttConfigured] = useState(false);
  const [telegramCommandMode, setTelegramCommandMode] = useState("");
  const [pendingCommandsCount, setPendingCommandsCount] = useState(0);
  const [bridgeAlive, setBridgeAlive] = useState(false);
  const [expectedWebhookUrl, setExpectedWebhookUrl] = useState("");
  const [actualTelegramWebhookUrl, setActualTelegramWebhookUrl] = useState("");
  const [appBaseUrl, setAppBaseUrl] = useState("");
  const [nextAction, setNextAction] = useState<string | null>(null);
  const [webhookSelfTestUrl, setWebhookSelfTestUrl] = useState("");
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairResult, setRepairResult] = useState<{
    ok: boolean;
    msg: string;
    description?: string;
    actualUrl?: string;
    nextAction?: string;
  } | null>(null);

  const notificationHistory = useMemo(() => events.slice(0, 12), [events]);

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
        setDirectMqttConfigured(Boolean(data.directMqttConfigured));
        setTelegramCommandMode(data.telegramCommandMode || "");
        setPendingCommandsCount(data.pendingCommandsCount || 0);
        setBridgeAlive(Boolean(data.bridgeAlive));
        setExpectedWebhookUrl(data.expectedWebhookUrl || "");
        setActualTelegramWebhookUrl(data.actualTelegramWebhookUrl || "");
        setAppBaseUrl(data.appBaseUrl || "");
        setNextAction(data.nextAction || null);
        setWebhookSelfTestUrl(data.webhookSelfTestUrl || "");
        
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
    }, 10000);
    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const handleRepair = async (force: boolean = false) => {
    setIsRepairing(true);
    setRepairResult(null);
    try {
      const response = await fetch("/api/telegram/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "webhook",
          repair: true,
          force
        }),
      });
      
      const data = await response.json();
      if (data.ok) {
        setRepairResult({
          ok: true,
          msg: "Webhook registered successfully",
          actualUrl: data.actualTelegramWebhookUrl,
          nextAction: data.nextAction
        });
      } else {
        setRepairResult({
          ok: false,
          msg: data.error || "Repair failed",
          description: data.setWebhookDescription,
          actualUrl: data.actualTelegramWebhookUrl,
          nextAction: data.nextAction
        });
      }
      
      await loadSetupState();
    } catch (err) {
      setRepairResult({
        ok: false,
        msg: "Network error during repair",
        nextAction: "Check your internet connection and verify APP_BASE_URL is reachable."
      });
      console.error(err);
    } finally {
      setIsRepairing(false);
    }
  };

  const telegramState = !botConfigured 
    ? "Awaiting Setup" 
    : !webhookEnabled 
      ? "Disabled" 
      : !webhookUrlMatch 
        ? "Webhook Mismatch" 
        : "Connected";

  const stateClass =
    telegramState === "Connected"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
      : telegramState === "Webhook Mismatch"
        ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
        : telegramState === "Disabled"
          ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
          : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-900 dark:to-slate-950">
      <PageContainer className="space-y-5">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Notifications</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Telegram integration, alert rules, channels, and notification operations.</p>
        </header>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="space-y-4 xl:col-span-7">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Telegram Diagnostics</h2>
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${stateClass}`}>{telegramState}</span>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950">Bot Configured: <span className="font-semibold">{botConfigured ? "Yes" : "No"}</span></div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950">Runtime Mode: <span className="font-semibold">{runtimeMode}</span></div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950">Webhook Enabled: <span className="font-semibold">{webhookEnabled ? "Yes" : "No"}</span></div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950">Webhook Match: <span className={`font-semibold ${webhookUrlMatch ? "text-emerald-600" : "text-red-600"}`}>{webhookUrlMatch ? "Yes" : "No"}</span></div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950">Allowed Users: <span className="font-semibold">{allowedUserIdsCount}</span></div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950">Bridge Alive: <span className="font-semibold">{bridgeAlive ? "Yes" : "No"}</span></div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs md:col-span-2 dark:border-slate-700 dark:bg-slate-950">APP_BASE_URL: <span className="font-mono font-semibold">{appBaseUrl || "Not set"}</span></div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs md:col-span-2 dark:border-slate-700 dark:bg-slate-950">Expected Webhook URL: <span className="font-mono text-[10px]">{expectedWebhookUrl || "None"}</span></div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs md:col-span-2 dark:border-slate-700 dark:bg-slate-950">Telegram Registered URL: <span className="font-mono text-[10px]">{actualTelegramWebhookUrl || "None"}</span></div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs md:col-span-2 dark:border-slate-700 dark:bg-slate-950">Direct MQTT Configured: <span className="font-semibold">{directMqttConfigured ? "Yes" : "No"}</span></div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs md:col-span-2 dark:border-slate-700 dark:bg-slate-950">Command Mode: <span className="font-semibold">{telegramCommandMode || "Unknown"}</span></div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs md:col-span-2 dark:border-slate-700 dark:bg-slate-950">Command Test Endpoint: <span className="font-mono">POST /api/mqtt/command-test</span></div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs md:col-span-2 dark:border-slate-700 dark:bg-slate-950">Self-test URL: <a href={webhookSelfTestUrl} target="_blank" className="font-mono text-blue-600 dark:text-blue-400 hover:underline">{webhookSelfTestUrl || "Not set"}</a></div>
              </div>

              {nextAction && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/30 dark:bg-amber-950/30 dark:text-amber-300">
                  <p className="font-bold">Next Action:</p>
                  <p>{nextAction}</p>
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={loadSetupState} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">Refresh Diagnostics</button>
                <button 
                  onClick={() => handleRepair(false)} 
                  disabled={isRepairing}
                  className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isRepairing ? "Repairing..." : "Repair Webhook from Env"}
                </button>
                {(webhookStatus === "mismatch" || webhookStatus === "missing") && (
                  <button 
                    onClick={() => handleRepair(true)} 
                    disabled={isRepairing}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-900/30 dark:bg-red-950/30 dark:text-red-300"
                  >
                    Force Repair
                  </button>
                )}
              </div>

              <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 italic">
                * APP_BASE_URL defines the expected URL. Click &quot;Repair&quot; to explicitly register it with Telegram via setWebhook.
              </p>

              {repairResult && (
                <div className={`mt-3 rounded-lg border p-3 text-xs ${repairResult.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/30 dark:bg-emerald-950/30 dark:text-emerald-300" : "border-red-200 bg-red-50 text-red-800 dark:border-red-900/30 dark:bg-red-950/30 dark:text-red-300"}`}>
                  <p className="font-bold">{repairResult.ok ? "Repair Succeeded" : "Repair Failed"}</p>
                  <p>{repairResult.msg}</p>
                  {repairResult.description && <p className="mt-1 font-mono text-[10px] opacity-80">Telegram says: {repairResult.description}</p>}
                  {repairResult.nextAction && <p className="mt-2 font-bold underline">Action Required: {repairResult.nextAction}</p>}
                </div>
              )}

              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950">Webhook Status: <span className="font-semibold uppercase">{webhookStatus}</span></div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950">Command Registration: <span className="font-semibold">{commandRegistration}</span></div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950">Pending Commands: <span className="font-semibold">{pendingCommandsCount}</span></div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950">Polling Status: <span className="font-semibold">{pollingStatus}</span></div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Telegram Command Center</h2>
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                {commandItems.map((item) => (
                  <div key={item.cmd} className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.cmd}</p>
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">{item.permission}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{item.purpose}</p>
                    <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-300">Execution ready</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="space-y-4 xl:col-span-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Remote Command Flow</h2>
              <div className="mt-3 space-y-1 text-sm">
                {["Telegram User", "Telegram Bot", "Cloud Command Queue", "MQTT Broker", "ESP32 Device", "ACK Response", "Realtime Dashboard Update"].map((item, idx) => (
                  <div key={item} className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">{idx + 1}</div>
                    <p className="text-slate-700 dark:text-slate-200">{item}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">BotFather Group Setup</h2>
              <ol className="mt-3 list-decimal space-y-1 pl-4 text-xs text-slate-600 dark:text-slate-300">
                <li>Open @BotFather and run <span className="font-semibold">/mybots</span>.</li>
                <li>Disable bot privacy mode if you want non-mention group commands to be read.</li>
                <li>Add bot to group/supergroup with message read and send permissions.</li>
                <li>Run <span className="font-semibold">/register_group</span> in the target group.</li>
              </ol>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Alert Severity Rules</h2>
              <div className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <p className="flex items-center gap-2"><Shield size={14} /> Critical: Immediate device risk</p>
                <p className="flex items-center gap-2"><Command size={14} /> Warning: Requires operator attention</p>
                <p className="flex items-center gap-2"><Bot size={14} /> Info: Telemetry insights</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Notification History</h2>
              <div className="mt-3 space-y-2">
                {notificationHistory.length === 0 ? <p className="text-xs text-slate-500">No notification events.</p> : notificationHistory.map((item, index) => (
                  <div key={`${item.timestamp}-${item.action}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-950">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{item.action}</p>
                    <p className="text-[11px] text-slate-500">{formatDateTime(item.timestamp)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Device Alert Events</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{smartAlerts.length} active alert events in current session.</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Command Audit Logs</h2>
              <div className="mt-3 space-y-2">
                {auditLogs.length === 0 ? (
                  <p className="text-xs text-slate-500">No command logs yet.</p>
                ) : (
                  auditLogs.map((log) => (
                    <div key={log.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-950">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{log.command} • {log.result}</p>
                      <p className="text-[11px] text-slate-500">{log.detail}</p>
                      <p className="text-[11px] text-slate-500">{formatDateTime(log.timestamp)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </section>
      </PageContainer>
    </main>
  );
}
