"use client";

import { useEffect, useState } from "react";
import { 
  Bot, 
  Shield, 
  Bell, 
  Activity, 
  RefreshCcw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  CloudRain, 
  Sun, 
  Heart, 
  ChevronDown, 
  ChevronUp, 
  Terminal 
} from "lucide-react";
import PageContainer from "@/components/layout/PageContainer";
import { formatDateTime } from "@/utils/timeFormat";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { NotificationPresenter } from "./presenters/NotificationPresenter";

type TelegramDeliveryLog = {
  id: string;
  message: string;
  type: "RAIN_ALERT" | "DEVICE_OFFLINE" | "DEVICE_ONLINE" | "SYSTEM_HEALTH" | "TEST";
  status: "PENDING" | "SUCCESS" | "FAILED";
  telegramMessageId?: number;
  chatId: string;
  error?: string;
  createdAt: any;
  deliveredAt?: any;
  deviceId?: string;
  telemetryContext?: any;
};

const templates = {
  rain_alert: {
    label_en: "Rain Alert",
    label_id: "Peringatan Hujan",
    message_en: "🌧 Rain detected.\nClothesline automatically retracted.\n\nTime: {time}\nDevice: ESP32-01",
    message_id: "🌧 Hujan terdeteksi.\nJemuran otomatis ditarik masuk.\n\nWaktu: {time}\nAlat: ESP32-01",
    type: "RAIN_ALERT",
  },
  device_offline: {
    label_en: "Device Offline",
    label_id: "Alat Offline",
    message_en: "⚠️ Device went offline.\nCheck power and network status.\n\nTime: {time}\nDevice: ESP32-01",
    message_id: "⚠️ Alat terputus (offline).\nPeriksa daya dan status jaringan.\n\nWaktu: {time}\nAlat: ESP32-01",
    type: "DEVICE_OFFLINE",
  },
  device_online: {
    label_en: "Device Online",
    label_id: "Alat Online",
    message_en: "❇️ Device is back online.\nTelemetry sync restored.\n\nTime: {time}\nDevice: ESP32-01",
    message_id: "❇️ Alat kembali terhubung (online).\nSinkronisasi telemetri dipulihkan.\n\nWaktu: {time}\nAlat: ESP32-01",
    type: "DEVICE_ONLINE",
  },
  system_health: {
    label_en: "System Health",
    label_id: "Kesehatan Sistem",
    message_en: "❤️ System health check OK.\nAll background operations functioning normally.\n\nTime: {time}\nDevice: ESP32-01",
    message_id: "❤️ Pemeriksaan kesehatan sistem OK.\nSemua operasi latar belakang berfungsi normal.\n\nWaktu: {time}\nAlat: ESP32-01",
    type: "SYSTEM_HEALTH",
  },
  clothes_dry: {
    label_en: "Clothes Dry",
    label_id: "Pakaian Kering",
    message_en: "👕 Clothes dry template message.\n\nTime: {time}\nDevice: ESP32-01",
    message_id: "👕 Templat pesan pakaian kering.\n\nWaktu: {time}\nAlat: ESP32-01",
    type: "CLOTHES_DRY",
  },
};

const IconMap: Record<string, React.ComponentType<any>> = {
  CloudRain,
  CheckCircle,
  XCircle,
  Sun,
  Heart,
  Bell,
};

export default function NotificationsPage({ lang = "en" }: { lang?: "en" | "id" }) {
  const t = (en: string, id: string) => (lang === "id" ? id : en);

  // States
  const [webhookStatus, setWebhookStatus] = useState("Unknown");
  const [webhookMismatchReason, setWebhookMismatchReason] = useState("");
  const [deliveryLogs, setDeliveryLogs] = useState<TelegramDeliveryLog[]>([]);
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});
  
  // Test Center States
  const [testMessage, setTestMessage] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "success" | "failed">("idle");

  // Template States
  const [sendingTemplate, setSendingTemplate] = useState(false);

  // Retry States
  const [retryingId, setRetryingId] = useState<string | null>(null);

  // Diagnostics States
  const [botConfigured, setBotConfigured] = useState(false);
  const [chatIdConfigured, setChatIdConfigured] = useState(false);
  const [defaultChatId, setDefaultChatId] = useState("");
  const [webhookHealthy, setWebhookHealthy] = useState(false);
  const [lastDeliveryStatus, setLastDeliveryStatus] = useState<string | null>(null);
  const [lastDeliveryAt, setLastDeliveryAt] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [appBaseUrl, setAppBaseUrl] = useState("");
  const [allowedGroupsCount, setAllowedGroupsCount] = useState(0);

  // Helper for predefined time
  const formatTemplateTime = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  };

  const loadSetupState = async () => {
    try {
      // 1. Webhook Health
      const healthResponse = await fetch("/api/telegram/webhook-health");
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        setWebhookStatus(healthData.status);
        setWebhookMismatchReason(healthData.mismatchReason || "");
      }

      // 2. Diagnostics Panel
      const diagResponse = await fetch("/api/telegram/diagnostics");
      if (diagResponse.ok) {
        const data = await diagResponse.json();
        setBotConfigured(Boolean(data.botConfigured));
        setChatIdConfigured(Boolean(data.chatIdConfigured));
        setDefaultChatId(data.defaultChatId || "");
        setWebhookHealthy(Boolean(data.webhookHealthy));
        setLastDeliveryStatus(data.lastDeliveryStatus);
        setLastDeliveryAt(data.lastDeliveryAt);
        setLastError(data.lastError);
        setAppBaseUrl(data.appBaseUrl || "");
        setAllowedGroupsCount(data.allowedGroupsCount || 0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 1. Load setup state on mount & poll
  useEffect(() => {
    void loadSetupState();
    const timer = window.setInterval(() => {
      void loadSetupState();
    }, 15000);
    return () => window.clearInterval(timer);
  }, []);

  // 2. Setup real-time Firestore listener for deliveries
  useEffect(() => {
    const q = query(
      collection(db, "telegram_deliveries"),
      orderBy("createdAt", "desc"),
      limit(25)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const logs: TelegramDeliveryLog[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          logs.push({
            id: doc.id,
            message: data.message || "",
            type: data.type || "TEST",
            status: data.status || "PENDING",
            telegramMessageId: data.telegramMessageId,
            chatId: data.chatId || "",
            error: data.error,
            createdAt: data.createdAt,
            deliveredAt: data.deliveredAt,
            deviceId: data.deviceId,
            telemetryContext: data.telemetryContext,
          });
        });
        setDeliveryLogs(logs);
      },
      (error) => {
        console.error("Failed to stream delivery logs", error);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleRepair = async () => {
    try {
      await fetch("/api/telegram/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repair: true, force: true }),
      });
      await loadSetupState();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendTest = async () => {
    if (!testMessage.trim()) return;
    setSendingTest(true);
    setTestStatus("idle");
    try {
      const targetChatId = defaultChatId || "6393706909";
      const res = await fetch("/api/telegram/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: testMessage,
          chatId: targetChatId,
          notificationType: "TEST",
        }),
      });
      if (res.ok) {
        setTestStatus("success");
        setTestMessage("");
      } else {
        setTestStatus("failed");
      }
    } catch {
      setTestStatus("failed");
    } finally {
      setSendingTest(false);
      void loadSetupState();
    }
  };

  const handleSendTemplate = async (tpl: typeof templates.rain_alert) => {
    setSendingTemplate(true);
    try {
      const targetChatId = defaultChatId || "6393706909";
      const formattedMsg = (lang === "id" ? tpl.message_id : tpl.message_en).replace("{time}", formatTemplateTime());
      await fetch("/api/telegram/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: formattedMsg,
          chatId: targetChatId,
          notificationType: tpl.type,
        }),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSendingTemplate(false);
      void loadSetupState();
    }
  };

  const handleRetryLog = async (log: TelegramDeliveryLog) => {
    setRetryingId(log.id);
    try {
      const res = await fetch("/api/telegram/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: log.message,
          chatId: log.chatId,
          notificationType: log.type,
        }),
      });
      if (res.ok) {
        // Success
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRetryingId(null);
      void loadSetupState();
    }
  };

  const toggleLogExpand = (id: string) => {
    setExpandedLogs((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Styling helpers
  const getWebhookStatusLabel = () => {
    switch (webhookStatus) {
      case "Connected":
        return t("Connected", "Terhubung");
      case "Disconnected":
        return t("Disconnected", "Terputus");
      case "Webhook Mismatch":
        return t("Webhook Mismatch", "Webhook Tidak Cocok");
      case "Webhook Not Registered":
        return t("Webhook Not Registered", "Webhook Tidak Terdaftar");
      default:
        return t("Disconnected", "Terputus");
    }
  };

  const stateClass =
    webhookStatus === "Connected"
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
      : webhookStatus === "Disconnected"
        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
        : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20";

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    if (s === "SUCCESS") {
      return (
        <span className="flex items-center gap-1 text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full uppercase tracking-widest border border-emerald-500/20">
          <CheckCircle size={10} />
          {t("SUCCESS", "BERHASIL")}
        </span>
      );
    }
    if (s === "FAILED") {
      return (
        <span className="flex items-center gap-1 text-[10px] font-black text-rose-500 bg-rose-500/10 px-2.5 py-1 rounded-full uppercase tracking-widest border border-rose-500/20">
          <XCircle size={10} />
          {t("FAILED", "GAGAL")}
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-[10px] font-black text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full uppercase tracking-widest border border-amber-500/20">
        <Clock size={10} className="animate-spin" />
        {t("PENDING", "TERTUNDA")}
      </span>
    );
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "RAIN_ALERT":
        return t("Rain Alert", "Peringatan Hujan");
      case "DEVICE_OFFLINE":
        return t("Device Offline", "Alat Terputus");
      case "DEVICE_ONLINE":
        return t("Device Online", "Alat Terhubung");
      case "SYSTEM_HEALTH":
        return t("System Health", "Kesehatan Sistem");
      case "TEST":
      default:
        return t("Test Message", "Pesan Uji");
    }
  };

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
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-white shadow-lg shadow-teal-500/20">
                  <Bell className="h-5 w-5 text-teal-500" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-[0.25em] text-teal-600 dark:text-teal-400">
                  {t("Notification Hub", "Pusat Notifikasi")}
                </span>
              </div>
              <h1 className="text-5xl md:text-6xl font-black text-slate-800 dark:text-white tracking-tighter">
                {t("System Alerts", "Pemberitahuan Sistem")}
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <div className={`px-6 py-3 rounded-2xl flex items-center gap-3 font-black text-xs tracking-widest ${stateClass}`}>
                <Bot className="h-4 w-4" />
                {getWebhookStatusLabel().toUpperCase()}
              </div>
              <button
                onClick={loadSetupState}
                className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200/50 dark:border-white/5 shadow-sm hover:bg-slate-50 dark:hover:bg-white/10 transition-all active:scale-95"
              >
                <RefreshCcw className="h-5 w-5 text-slate-500" />
              </button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
          {/* Main Content Area */}
          <div className="flex flex-col xl:col-span-8 space-y-8">
            
            {/* Telegram Test Center */}
            <section className="rounded-[2.5rem] bg-white dark:bg-slate-900/40 p-10 shadow-xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                  <Bot className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
                  {t("Telegram Test Center", "Pusat Uji Telegram")}
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-400 tracking-[0.2em] mb-2">
                    {t("Custom Message", "Pesan Kustom")}
                  </label>
                  <textarea
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder={t("Type your test message here...", "Ketik pesan uji Anda di sini...")}
                    className="w-full h-24 rounded-2xl border border-slate-200/60 dark:border-white/5 bg-[#f8fafc] dark:bg-slate-950 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-800 dark:text-white"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <button
                    disabled={sendingTest || !testMessage.trim()}
                    onClick={handleSendTest}
                    className="px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs tracking-widest uppercase disabled:opacity-50 disabled:pointer-events-none transition-all active:scale-95 flex items-center gap-2"
                  >
                    {sendingTest ? t("Sending...", "Mengirim...") : t("Send Test Notification", "Kirim Notifikasi Uji")}
                  </button>

                  {testStatus === "success" && (
                    <span className="text-xs font-black text-emerald-500 bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/25">
                      {t("Success", "Berhasil")}
                    </span>
                  )}
                  {testStatus === "failed" && (
                    <span className="text-xs font-black text-rose-500 bg-rose-500/10 px-4 py-2 rounded-full border border-rose-500/25">
                      {t("Failed", "Gagal")}
                    </span>
                  )}
                </div>
              </div>
            </section>

            {/* Quick Alert Templates */}
            <section className="rounded-[2.5rem] bg-white dark:bg-slate-900/40 p-10 shadow-xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em] mb-4">
                {t("Quick Alert Templates", "Templat Notifikasi Cepat")}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(templates).map(([key, tpl]) => (
                  <button
                    key={key}
                    disabled={sendingTemplate}
                    onClick={() => handleSendTemplate(tpl)}
                    className="p-4 rounded-2xl bg-[#f8fafc] dark:bg-slate-950 border border-slate-200/50 dark:border-white/5 hover:border-teal-500/30 transition-all font-bold text-xs text-slate-800 dark:text-white uppercase tracking-wider text-center flex flex-col items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-900 active:scale-95 disabled:opacity-50"
                  >
                    <span>{lang === "id" ? tpl.label_id : tpl.label_en}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Activity Log / Delivery History */}
            <section className="flex-1 flex flex-col rounded-[2.5rem] bg-white dark:bg-slate-900/40 p-10 shadow-xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                  <Activity className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
                  {t("Activity Log", "Log Aktivitas")}
                </h2>
              </div>

              <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
                {deliveryLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 opacity-30">
                    <Activity className="h-12 w-12 mb-4 text-teal-500" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-center">
                      {t("No Delivery Records Found", "Tidak Ada Catatan Pengiriman Ditemukan")}
                    </p>
                  </div>
                ) : (
                  deliveryLogs.map((log) => {
                    const presented = NotificationPresenter.present(log);
                    const { userNotification, technicalPayload } = presented;
                    const isExpanded = !!expandedLogs[log.id];
                    const IconComponent = IconMap[userNotification.icon] || Bell;
                    
                    // Severity colors mapping
                    let severityBg = "bg-blue-50/50 dark:bg-blue-950/10 border-blue-100 dark:border-blue-900/30";
                    let iconBg = "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400";
                    if (userNotification.severity === "warning") {
                      severityBg = "bg-amber-50/50 dark:bg-amber-950/10 border-amber-100 dark:border-amber-900/30";
                      iconBg = "bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400";
                    } else if (userNotification.severity === "critical") {
                      severityBg = "bg-rose-50/50 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/30";
                      iconBg = "bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400";
                    } else if (userNotification.severity === "info") {
                      if (userNotification.displayColor === "emerald") {
                        severityBg = "bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/30";
                        iconBg = "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400";
                      } else if (userNotification.displayColor === "teal") {
                        severityBg = "bg-teal-50/50 dark:bg-teal-950/10 border-teal-100 dark:border-teal-900/30";
                        iconBg = "bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400";
                      }
                    }

                    return (
                      <div
                        key={log.id}
                        className={`p-6 rounded-3xl border transition-all duration-300 shadow-sm hover:shadow-md ${severityBg}`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-2xl ${iconBg} shrink-0`}>
                            <IconComponent className="h-6 w-6" />
                          </div>
                          
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center justify-between gap-4">
                              <h4 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">
                                {lang === "id" ? userNotification.title : getTypeLabel(log.type)}
                              </h4>
                              <div className="flex items-center gap-2">
                                {getStatusBadge(log.status)}
                                {log.status === "FAILED" && (
                                  <button
                                    disabled={retryingId === log.id}
                                    onClick={() => handleRetryLog(log)}
                                    className="px-3 py-1 text-[9px] font-black uppercase tracking-widest text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors active:scale-95 disabled:opacity-50"
                                  >
                                    {retryingId === log.id ? t("Retry...", "Mengulang...") : t("Retry", "Ulangi")}
                                  </button>
                                )}
                              </div>
                            </div>
                            
                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                              {lang === "id" ? userNotification.details : userNotification.summary}
                            </p>
                            
                            <div className="flex flex-wrap items-center justify-between pt-3 border-t border-slate-100 dark:border-white/5 text-[11px] font-bold text-slate-400">
                              <div className="flex items-center gap-1">
                                <span>Status:</span>
                                <span className={`uppercase ${log.status === 'SUCCESS' ? 'text-emerald-500' : 'text-slate-500'}`}>
                                  {log.status === 'SUCCESS' ? t("Online", "Aktif") : log.status}
                                </span>
                                <span className="mx-1.5">•</span>
                                <span>{userNotification.formattedTime}</span>
                              </div>
                              
                              <button
                                onClick={() => toggleLogExpand(log.id)}
                                className="flex items-center gap-1 text-teal-600 hover:text-teal-700 transition-colors uppercase tracking-wider text-[10px]"
                              >
                                <Terminal className="h-3 w-3" />
                                {isExpanded ? t("Hide Details", "Sembunyikan Detail") : t("View Details", "Lihat Detail")}
                                {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                              </button>
                            </div>

                            {/* Collapsible Developer Details Panel */}
                            {isExpanded && (
                              <div className="mt-4 p-5 rounded-2xl bg-[#020617] border border-slate-800 text-slate-300 font-mono text-[11px] space-y-4 animate-fadeIn">
                                <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                                  <Terminal className="h-4 w-4 text-teal-500" />
                                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Developer Details (Layer A)</span>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-1.5">
                                    <div className="flex justify-between border-b border-slate-900 pb-1">
                                      <span className="text-slate-500">Device ID:</span>
                                      <span className="text-white">{technicalPayload.deviceId}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-900 pb-1">
                                      <span className="text-slate-500">Firestore ID:</span>
                                      <span className="text-slate-400 truncate max-w-[150px]" title={technicalPayload.debugInfo.firestoreId}>
                                        {technicalPayload.debugInfo.firestoreId}
                                      </span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-900 pb-1">
                                      <span className="text-slate-500">Telegram Msg ID:</span>
                                      <span className="text-slate-400">{technicalPayload.debugInfo.telegramMessageId || "-"}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-900 pb-1">
                                      <span className="text-slate-500">Chat ID:</span>
                                      <span className="text-slate-400">{technicalPayload.debugInfo.chatId}</span>
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-1.5">
                                    <div className="flex justify-between border-b border-slate-900 pb-1">
                                      <span className="text-slate-500">Temperature:</span>
                                      <span className="text-emerald-400">{technicalPayload.sensorValues.temperature}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-900 pb-1">
                                      <span className="text-slate-500">Humidity:</span>
                                      <span className="text-emerald-400">{technicalPayload.sensorValues.humidity}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-900 pb-1">
                                      <span className="text-slate-500">Light Intensity:</span>
                                      <span className="text-emerald-400">{technicalPayload.sensorValues.light}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-900 pb-1">
                                      <span className="text-slate-500">Rain Status:</span>
                                      <span className="text-emerald-400">{technicalPayload.sensorValues.rain}</span>
                                    </div>
                                  </div>
                                </div>
                                
                                {technicalPayload.debugInfo.localhostUrls.length > 0 && (
                                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px]">
                                    <p className="font-bold uppercase tracking-wider mb-1">Warning: Localhost URLs Detected</p>
                                    <ul className="list-disc list-inside space-y-0.5 font-sans">
                                      {technicalPayload.debugInfo.localhostUrls.map((url, i) => (
                                        <li key={i} className="truncate">{url}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                <div className="space-y-1">
                                  <span className="text-slate-500">MQTT Metadata:</span>
                                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-900 text-slate-400 whitespace-pre-wrap truncate">
                                    Topic: {technicalPayload.mqttMetadata?.topic}
                                    {"\n"}Broker: {technicalPayload.mqttMetadata?.broker}
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <span className="text-slate-500">Raw Message Payload:</span>
                                  <pre className="p-3 rounded-xl bg-slate-950 border border-slate-900 text-slate-400 overflow-x-auto text-[10px] max-h-[150px]">
                                    {technicalPayload.rawMessage}
                                  </pre>
                                </div>

                                <div className="space-y-1">
                                  <span className="text-slate-500">Firestore Raw JSON:</span>
                                  <pre className="p-3 rounded-xl bg-slate-950 border border-slate-900 text-slate-400 overflow-x-auto text-[10px] max-h-[150px]">
                                    {technicalPayload.debugInfo.rawPayloadJson}
                                  </pre>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>

          {/* Sidebar Area */}
          <aside className="xl:col-span-4 space-y-8">
            <section className="flex-1 flex flex-col rounded-[2.5rem] bg-white dark:bg-slate-900/40 p-8 shadow-xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">
                    {t("Diagnostics", "Diagnostik")}
                  </h2>
                </div>
                <button
                  onClick={() => handleRepair()}
                  className="text-[10px] font-black text-teal-600 hover:text-teal-700 uppercase tracking-widest transition-colors"
                >
                  {t("Sync", "Sinkronisasi")}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-[#f8fafc] dark:bg-slate-950 border border-slate-200/50 dark:border-white/5">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("Bot Configured", "Bot Terkonfigurasi")}</span>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${botConfigured ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {botConfigured ? t("YES", "YA") : t("NO", "TIDAK")}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl bg-[#f8fafc] dark:bg-slate-950 border border-slate-200/50 dark:border-white/5">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("Recipient Chat", "Chat Penerima")}</span>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${chatIdConfigured ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {chatIdConfigured ? t("CONNECTED", "TERHUBUNG") : t("DISCONNECTED", "TERPUTUS")}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl bg-[#f8fafc] dark:bg-slate-950 border border-slate-200/50 dark:border-white/5">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("Webhook Healthy", "Webhook Sehat")}</span>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${webhookHealthy ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {webhookHealthy ? t("HEALTHY", "SEHAT") : t("UNHEALTHY", "TIDAK SEHAT")}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl bg-[#f8fafc] dark:bg-slate-950 border border-slate-200/50 dark:border-white/5">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("Authorized Groups", "Grup Diizinkan")}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-white">
                    {allowedGroupsCount}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl bg-[#f8fafc] dark:bg-slate-950 border border-slate-200/50 dark:border-white/5">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("Last Status", "Status Terakhir")}</span>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${lastDeliveryStatus === 'SUCCESS' ? 'text-emerald-500' : lastDeliveryStatus === 'FAILED' ? 'text-rose-500' : 'text-slate-400'}`}>
                    {lastDeliveryStatus ? t(lastDeliveryStatus, lastDeliveryStatus) : t("NONE", "TIDAK ADA")}
                  </span>
                </div>
                {lastDeliveryAt && (
                  <div className="flex flex-col p-4 rounded-2xl bg-[#f8fafc] dark:bg-slate-950 border border-slate-200/50 dark:border-white/5 gap-1">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("Last Delivery At", "Pengiriman Terakhir")}</span>
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate">
                      {formatDateTime(new Date(lastDeliveryAt).getTime())}
                    </span>
                  </div>
                )}
                {lastError && (
                  <div className="flex flex-col p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10 gap-1">
                    <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{t("Last Error", "Error Terakhir")}</span>
                    <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 whitespace-pre-wrap leading-tight">
                      {lastError}
                    </span>
                  </div>
                )}
              </div>

              {webhookMismatchReason && (
                <div className="mt-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                  <p className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-widest mb-1">{t("Warnings", "Peringatan")}</p>
                  <p className="text-[10px] font-bold text-amber-700 dark:text-amber-300 leading-tight">
                    • {webhookMismatchReason}
                  </p>
                </div>
              )}

              <div className="mt-8 pt-8 border-t border-slate-100 dark:border-white/5 space-y-4">
                <div className="p-5 rounded-2xl bg-[#020617] text-[10px] font-mono text-slate-400 overflow-hidden shadow-inner border border-slate-800">
                  <p className="mb-2 text-teal-500">{"// ENDPOINT"}</p>
                  <p className="truncate opacity-80">{appBaseUrl || t("Not set", "Belum diatur")}</p>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </PageContainer>
    </main>
  );
}
