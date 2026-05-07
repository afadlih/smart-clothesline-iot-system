"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, Command, Shield } from "lucide-react";
import PageContainer from "@/components/layout/PageContainer";
import { useSystemState } from "@/hooks/useSystemState";

type TelegramState = "Connected" | "Invalid Token" | "Awaiting Setup" | "Disabled";

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
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [authorizedUser, setAuthorizedUser] = useState("");
  const [telegramState, setTelegramState] = useState<TelegramState>("Awaiting Setup");
  const [webhookStatus, setWebhookStatus] = useState("Unknown");
  const [commandRegistration, setCommandRegistration] = useState("Unknown");
  const [integrationMode, setIntegrationMode] = useState<"polling" | "webhook">("webhook");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [pollingStatus, setPollingStatus] = useState("stopped");
  const [pollingUptime, setPollingUptime] = useState(0);
  const [auditLogs, setAuditLogs] = useState<Array<{ id: string; command: string; result: string; detail: string; timestamp: number; username?: string }>>([]);
  const notificationHistory = useMemo(() => events.slice(0, 12), [events]);

  const loadSetupState = async () => {
    const setupResponse = await fetch("/api/telegram/setup");
    if (setupResponse.ok) {
      const data = (await setupResponse.json()) as {
        configured?: boolean;
        tokenValid?: boolean;
        mode?: "polling" | "webhook";
        hasWebhookSecret?: boolean;
        polling?: { status?: string; uptimeMs?: number };
        auditLogs?: Array<{ id: string; command: string; result: string; detail: string; timestamp: number; username?: string }>;
        authorizedUsers?: Array<{ userId: number; username?: string; role: "Viewer" | "Operator" | "Admin" }>;
      };
      setIntegrationMode(data.mode ?? "webhook");
      setWebhookStatus(data.hasWebhookSecret ? "Configured" : "Awaiting Setup");
      setCommandRegistration(data.configured && data.tokenValid ? "Registered" : "Pending");
      setPollingStatus(data.polling?.status ?? "stopped");
      setPollingUptime(data.polling?.uptimeMs ?? 0);
      if (Array.isArray(data.authorizedUsers) && data.authorizedUsers[0]) {
        const first = data.authorizedUsers[0];
        setAuthorizedUser(first.username ? `${first.username} (${first.userId})` : String(first.userId));
      }
      setTelegramState(data.tokenValid ? "Connected" : "Awaiting Setup");
      setAuditLogs(Array.isArray(data.auditLogs) ? data.auditLogs : []);
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

  const stateClass =
    telegramState === "Connected"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
      : telegramState === "Invalid Token"
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
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Telegram Integration</h2>
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${stateClass}`}>{telegramState}</span>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-xs text-slate-500">Bot Token<input value={botToken} onChange={(e) => setBotToken(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" /></label>
                <label className="text-xs text-slate-500">Chat ID<input value={chatId} onChange={(e) => setChatId(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" /></label>
                <label className="text-xs text-slate-500 md:col-span-2">Authorized User<input value={authorizedUser} onChange={(e) => setAuthorizedUser(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" /></label>
                <label className="text-xs text-slate-500">Integration Mode
                  <select value={integrationMode} onChange={(e) => setIntegrationMode(e.target.value as "polling" | "webhook")} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">
                    <option value="webhook">webhook</option>
                    <option value="polling">polling</option>
                  </select>
                </label>
                <label className="text-xs text-slate-500">Webhook Secret<input value={webhookSecret} onChange={(e) => setWebhookSecret(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" /></label>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={async () => {
                  const response = await fetch("/api/telegram/setup", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      botToken,
                      chatId,
                      webhookSecret,
                      mode: integrationMode,
                      enabled: true,
                      webhookUrl: typeof window !== "undefined" ? `${window.location.origin}/api/telegram/webhook` : undefined,
                      authorizedUsers: (() => {
                        const parsed = Number(authorizedUser.replace(/[^\d]/g, ""));
                        return Number.isFinite(parsed) && parsed > 0
                          ? [{ userId: parsed, username: authorizedUser, role: "Admin" }]
                          : [];
                      })(),
                    }),
                  });
                  const data = (await response.json()) as { ok?: boolean; commandRegistered?: boolean; webhookRegistered?: boolean };
                  setTelegramState(data.ok ? "Connected" : "Invalid Token");
                  setCommandRegistration(data.commandRegistered ? "Registered" : "Pending");
                  setWebhookStatus(data.webhookRegistered ? "Healthy" : "Failed");
                  await loadSetupState();
                }} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">Test Connection</button>
                <button onClick={() => setTelegramState("Disabled")} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">Disable Integration</button>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950">Webhook Status: <span className="font-semibold">{webhookStatus}</span></div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950">Command Registration: <span className="font-semibold">{commandRegistration}</span></div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950">Polling Status: <span className="font-semibold">{pollingStatus}</span></div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950">Polling Uptime: <span className="font-semibold">{Math.floor(pollingUptime / 1000)}s</span></div>
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
                    <p className="text-[11px] text-slate-500">{new Date(item.timestamp).toLocaleString("en-US")}</p>
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
                      <p className="text-[11px] text-slate-500">{new Date(log.timestamp).toLocaleString("en-US")}</p>
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
