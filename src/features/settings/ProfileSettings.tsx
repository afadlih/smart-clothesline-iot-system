"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Bell,
  BluetoothSearching,
  Download,
  HardDrive,
  Save,
  Smartphone,
  Trash2,
  User,
} from "lucide-react";
import NotificationSettings, { type NotificationPreference } from "./NotifSettings";
import DeviceSettings from "./DeviceSettings";
import PairingDeviceSettings, { type PairableDevice } from "./PairingDeviceSettings";
import PageContainer from "@/components/layout/PageContainer";
import { useSensor } from "@/hooks/useSensor";
import { DataExportService } from "@/services/DataExportService";
import { ScheduleService, type ScheduleSummary } from "@/services/ScheduleService";
import {
  mqttService,
  PAIRING_DISCOVERY_TOPIC,
  type PairingDiscoveryMessage,
} from "@/services/MQTTService";

type TabId = "profile" | "notification" | "device" | "pairing" | "data-management";

type AppSettings = {
  profileName: string;
  notification: NotificationPreference;
  whatsappNumber: string;
  rainThreshold: number;
  lightThreshold: number;
  autoCloseOnRain: boolean;
  autoCloseOnDark: boolean;
  updateIntervalSec: number;
  autoOpenWhenSafe: boolean;
};

const SETTINGS_STORAGE_KEY = "smart-clothesline-settings-v1";
const DEVICES_STORAGE_KEY = "smart-clothesline-devices-v1";
const ACTIVE_DEVICE_STORAGE_KEY = "smart-clothesline-active-device-id-v1"

const defaultSettings: AppSettings = {
  profileName: "Operator",
  notification: {
    rain: true,
    dry: true,
    report: false,
    whatsapp: false,
  },
  whatsappNumber: "",
  rainThreshold: 2000,
  lightThreshold: 3000,
  autoCloseOnRain: true,
  autoCloseOnDark: true,
  updateIntervalSec: 5,
  autoOpenWhenSafe: false,
};

const initialDevices: PairableDevice[] = [
  {
    id: "wokwi-default",
    name: "Wokwi Simulator",
    signal: "Testing device",
    status: "Available",
    source: "wokwi"
  }
];

const defaultScheduleSummary: ScheduleSummary = {
  totalCount: 0,
  activeCount: 0,
  isActiveNow: false,
  activeWindow: null,
};

export default function SettingsScreen() {
  const searchParams = useSearchParams();
  const { isOnline, publishConfig, deviceConfig, history } = useSensor();
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [saveLabel, setSaveLabel] = useState("Save Changes");
  const [isRestarting, setIsRestarting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [devices, setDevices] = useState<PairableDevice[]>(initialDevices);
  const [scheduleSummary, setScheduleSummary] = useState<ScheduleSummary>(defaultScheduleSummary);
  const [scheduleFallback, setScheduleFallback] = useState(false);
  const [didHydrateSettings, setDidHydrateSettings] = useState(false);
  const [didHydrateDeviceRef, setDidHydrateDeviceRef] = useState(false);
  const [cacheStats, setCacheStats] = useState({ history: 0, queue: 0, events: 0, total: 0, totalKB: 0 });
  const [lastCleared, setLastCleared] = useState<string | null>(null);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "profile" || tab === "notification" || tab === "device" || tab === "pairing" || tab === "data-management") {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      setDidHydrateSettings(true);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<AppSettings>;
      setSettings({
        profileName: parsed.profileName ?? defaultSettings.profileName,
        notification: {
          rain: parsed.notification?.rain ?? defaultSettings.notification.rain,
          dry: parsed.notification?.dry ?? defaultSettings.notification.dry,
          report: parsed.notification?.report ?? defaultSettings.notification.report,
          whatsapp: parsed.notification?.whatsapp ?? defaultSettings.notification.whatsapp,
        },
        whatsappNumber: parsed.whatsappNumber ?? defaultSettings.whatsappNumber,
        rainThreshold: parsed.rainThreshold ?? defaultSettings.rainThreshold,
        lightThreshold: parsed.lightThreshold ?? defaultSettings.lightThreshold,
        autoCloseOnRain: parsed.autoCloseOnRain ?? defaultSettings.autoCloseOnRain,
        autoCloseOnDark: parsed.autoCloseOnDark ?? defaultSettings.autoCloseOnDark,
        updateIntervalSec: parsed.updateIntervalSec ?? defaultSettings.updateIntervalSec,
        autoOpenWhenSafe: parsed.autoOpenWhenSafe ?? defaultSettings.autoOpenWhenSafe
      });
    } catch {
      localStorage.removeItem(SETTINGS_STORAGE_KEY);
    }

    setDidHydrateSettings(true);
  }, []);

  useEffect(() => {
    if (!didHydrateSettings) {
      return;
    }

    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [didHydrateSettings, settings]);

  useEffect(() => {
    if (!didHydrateSettings) {
      return;
    }

    const timer = window.setTimeout(() => {
      publishConfig({
        rainThreshold: settings.rainThreshold,
        lightThreshold: settings.lightThreshold,
        autoCloseOnRain: settings.autoCloseOnRain,
        autoCloseOnDark: settings.autoCloseOnDark,
        autoOpenWhenSafe: settings.autoOpenWhenSafe,
      });
    }, 400);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    didHydrateSettings,
    publishConfig,
    settings.autoCloseOnDark,
    settings.autoCloseOnRain,
    settings.autoOpenWhenSafe,
    settings.lightThreshold,
    settings.rainThreshold,
  ]);

  useEffect(() => {
    const loadScheduleSummary = async () => {
      const result = await ScheduleService.loadSchedules();
      const now = new Date();
      const currentDecimalHour = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;

      setScheduleFallback(result.fromCache);
      setScheduleSummary(ScheduleService.getSummary(result.schedules, currentDecimalHour));
    };

    void loadScheduleSummary();
    const onScheduleUpdated = () => {
      void loadScheduleSummary();
    };
    window.addEventListener("schedule-updated", onScheduleUpdated);

    const timer = window.setInterval(() => {
      void loadScheduleSummary();
    }, 1000);

    return () => {
      window.removeEventListener("schedule-updated", onScheduleUpdated);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem(DEVICES_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as {
          devices?: PairableDevice[];
          selectedDeviceId?: string | null;
        };
  
        if (Array.isArray(parsed.devices)) {
          setDevices(
            parsed.devices.filter(
              (device) =>
                typeof device.id === "string" &&
                typeof device.name === "string" &&
                typeof device.signal === "string" &&
                typeof device.status === "string",
            ),
          );
        }
  
        if (typeof parsed.selectedDeviceId === "string" || parsed.selectedDeviceId === null) {
          setSelectedDeviceId(parsed.selectedDeviceId ?? null);
        }
      } catch {
        localStorage.removeItem(DEVICES_STORAGE_KEY);
      }
    }

    const activeDeviceId = localStorage.getItem(ACTIVE_DEVICE_STORAGE_KEY);

    if (activeDeviceId) {
      setSelectedDeviceId(activeDeviceId);
    }

    setDidHydrateDeviceRef(true)
  }, []);

  useEffect(() => {
    if (!didHydrateDeviceRef) {
      return;
    }

    localStorage.setItem(
      DEVICES_STORAGE_KEY,
      JSON.stringify({
        devices,
        selectedDeviceId,
      }),
    );
  }, [devices, selectedDeviceId]);

  useEffect(() => {
    if (!didHydrateDeviceRef) {
      return;
    }

    if (selectedDeviceId) {
      localStorage.setItem(ACTIVE_DEVICE_STORAGE_KEY, selectedDeviceId);
      return;
    }

    localStorage.removeItem(ACTIVE_DEVICE_STORAGE_KEY);
  }, [selectedDeviceId])

  useEffect(() => {
    const unsubscribe = mqttService.subscribeTopic(PAIRING_DISCOVERY_TOPIC, (rawPayLoad) => {
      try {
        const payload = JSON.parse(rawPayLoad) as Partial<PairingDiscoveryMessage>;

        if (typeof payload.deviceId !== "string" || typeof payload.deviceName !== "string") {
          return;
        }

        const discoveredDevice: PairableDevice = {
          id: payload.deviceId,
          name: payload.deviceName,
          signal: payload.ipAddress ? `IP: ${payload.ipAddress}` : "ESP32 discovery",
          status: typeof payload.status === "string" ? payload.status : "pairable",
          source: "esp32",
          pairingCode: typeof payload.pairingCode === "string" ? payload.pairingCode : undefined,
          ipAddress: typeof payload.ipAddress === "string" ? payload.ipAddress : undefined,
          lastSeenAt: Date.now(),
        };

        setDevices((prev) => {
          const withoutSameDevice = prev.filter((device) => device.id !== discoveredDevice.id);
          return [discoveredDevice, ...withoutSameDevice].slice(0, 10);
        });
      } catch (e) {
        console.warn("[PAIRING] Failed to parse discovery payload: ", e)
      }
    });

    return unsubscribe;
  }, [])

  useEffect(() => {
    const refreshCacheStats = () => {
      const stats = DataExportService.getCacheStats();
      setCacheStats(stats);
    };

    refreshCacheStats();
    const interval = window.setInterval(refreshCacheStats, 5000);
    return () => window.clearInterval(interval);
  }, []);

  const onSaveSettings = () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    setSaveLabel("Saved");
    window.setTimeout(() => {
      setSaveLabel("Save Changes");
    }, 1400);
  };

  const onRestartDevice = () => {
    setIsRestarting(true);
    window.setTimeout(() => {
      setIsRestarting(false);
    }, 1800);
  };

  const onScanDevices = () => {
    setIsScanning(true);

    window.setTimeout(() => {
      setIsScanning(false);
    }, 1200);
  };

  const selectedDevice = devices.find((device) => device.id === selectedDeviceId) ?? null;
  const connectionStatus: "ONLINE" | "OFFLINE" = isOnline ? "ONLINE" : "OFFLINE";

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 transition-colors duration-300 dark:from-slate-900 dark:to-slate-950">
      <PageContainer className="text-slate-900 dark:text-slate-100">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Settings</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage Smart Clothesline preferences and device behavior</p>
        </header>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="flex flex-col gap-2 xl:col-span-3">
            {[
              { id: "profile" as const, label: "Profile", icon: <User size={18} /> },
              { id: "notification" as const, label: "Notifications", icon: <Bell size={18} /> },
              { id: "device" as const, label: "IoT Device", icon: <Smartphone size={18} /> },
              { id: "pairing" as const, label: "Device Pairing", icon: <BluetoothSearching size={18} /> },
              { id: "data-management" as const, label: "Data Management", icon: <HardDrive size={18} /> },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-all ${activeTab === item.id
                    ? "bg-green-600 text-white shadow-md"
                    : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>

          <div className="space-y-8 xl:col-span-9">
            {activeTab === "profile" && (
              <>
                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <h3 className="mb-4 text-lg font-bold text-slate-800 dark:text-slate-100">Profile Information</h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Name</label>
                      <input
                        type="text"
                        value={settings.profileName}
                        onChange={(event) =>
                          setSettings((prev) => ({
                            ...prev,
                            profileName: event.target.value,
                          }))
                        }
                        placeholder="Enter name"
                        aria-label="Profile name"
                        title="Profile name"
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm text-slate-900 outline-none focus:border-green-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Role</label>
                      <input
                        type="text"
                        value="Dashboard Operator"
                        disabled
                        aria-label="User role"
                        title="User role"
                        className="w-full rounded-lg border border-slate-200 bg-slate-100 p-2.5 text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Schedule Summary</h3>
                    <Link
                      href="/schedule"
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Open Schedule
                    </Link>
                  </div>
                  {scheduleFallback && (
                    <p className="mb-3 text-xs font-semibold text-amber-700 dark:text-amber-300">
                      Firestore unavailable. Showing cached schedule summary.
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Total Schedules</p>
                      <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{scheduleSummary.totalCount}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Enabled</p>
                      <p className="mt-1 text-lg font-bold text-green-600 dark:text-green-300">{scheduleSummary.activeCount}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Active Now</p>
                      <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
                        {scheduleSummary.isActiveNow ? "Yes" : "No"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Active Window</p>
                      <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{scheduleSummary.activeWindow ?? "-"}</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === "notification" && (
              <NotificationSettings
                value={settings.notification}
                onToggle={(key) => {
                  setSettings((prev) => ({
                    ...prev,
                    notification: {
                      ...prev.notification,
                      [key]: !prev.notification[key],
                    },
                  }));
                }}
                whatsappNumber={settings.whatsappNumber}
                onWhatsAppNumberChange={(value) =>
                  setSettings((prev) => ({
                    ...prev,
                    whatsappNumber: value,
                  }))
                }
              />
            )}

            {activeTab === "device" && (
              <DeviceSettings
                connectionStatus={connectionStatus}
                deviceName={selectedDevice?.name ?? "No active device"}
                ipAddress={selectedDevice?.ipAddress ?? "Not detected"}
                rainThreshold={settings.rainThreshold}
                lightThreshold={settings.lightThreshold}
                autoCloseOnRain={settings.autoCloseOnRain}
                autoCloseOnDark={settings.autoCloseOnDark}
                autoOpenWhenSafe={settings.autoOpenWhenSafe}
                configSyncState={deviceConfig.syncState}
                configSyncMessage={deviceConfig.syncMessage}
                configLastSyncAt={deviceConfig.lastSyncAt}
                updateIntervalSec={settings.updateIntervalSec}
                isRestarting={isRestarting}
                onRainThresholdChange={(value) =>
                  setSettings((prev) => ({
                    ...prev,
                    rainThreshold: value,
                  }))
                }
                onLightThresholdChange={(value) =>
                  setSettings((prev) => ({
                    ...prev,
                    lightThreshold: value,
                  }))
                }
                onAutoCloseOnRainChange={(value) =>
                  setSettings((prev) => ({
                    ...prev,
                    autoCloseOnRain: value,
                  }))
                }
                onAutoCloseOnDarkChange={(value) =>
                  setSettings((prev) => ({
                    ...prev,
                    autoCloseOnDark: value,
                  }))
                }
                onUpdateIntervalChange={(value) =>
                  setSettings((prev) => ({
                    ...prev,
                    updateIntervalSec: value,
                  }))
                }
                onAutoOpenWhenSafeChange={(value) => 
                  setSettings((prev) => ({
                    ...prev,
                    autoOpenWhenSafe: value
                  }))
                }
                onRestart={onRestartDevice}
              />
            )}

            {activeTab === "pairing" && (
              <PairingDeviceSettings
                discoveredDevices={devices}
                selectedDeviceId={selectedDeviceId}
                isScanning={isScanning}
                onScan={onScanDevices}
                onSelectDevice={(deviceId) => setSelectedDeviceId(deviceId)}
              />
            )}

            {activeTab === "data-management" && (
              <div className="space-y-8">
                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <h3 className="mb-4 text-lg font-bold text-slate-800 dark:text-slate-100">Export Sensor Data</h3>
                  <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">Download sensor data in CSV or JSON format</p>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => {
                        DataExportService.exportLastNDays(
                          history.map((h) => h.data),
                          7,
                          "csv",
                        );
                      }}
                      className="flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-300"
                    >
                      <Download size={16} /> Last 7 Days (CSV)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        DataExportService.exportLastNDays(
                          history.map((h) => h.data),
                          30,
                          "csv",
                        );
                      }}
                      className="flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-300"
                    >
                      <Download size={16} /> Last 30 Days (CSV)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        DataExportService.exportToJSON(
                          history.map((h) => h.data),
                          `clothesline-all-${new Date().toISOString().split("T")[0]}.json`,
                        );
                      }}
                      className="flex items-center justify-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700 transition hover:bg-green-100 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-300"
                    >
                      <Download size={16} /> All Data (JSON)
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <h3 className="mb-4 text-lg font-bold text-slate-800 dark:text-slate-100">Storage & Cache Statistics</h3>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
                      <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Sensor History</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{cacheStats.history}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">records</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
                      <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Queue Data</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{cacheStats.queue}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">pending items</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
                      <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Event Logs</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{cacheStats.events}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">entries</p>
                    </div>
                    <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                      <p className="text-xs font-semibold uppercase text-blue-600 dark:text-blue-300">Total Storage</p>
                      <p className="mt-2 text-2xl font-bold text-blue-900 dark:text-blue-100">{cacheStats.totalKB}</p>
                      <p className="text-xs text-blue-700 dark:text-blue-300">KB used</p>
                    </div>
                  </div>
                  {lastCleared && (
                    <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                      Last cleared: {new Date(lastCleared).toLocaleString("en-US")}
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <h3 className="mb-4 text-lg font-bold text-slate-800 dark:text-slate-100">Cache Management</h3>
                  <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">Clear cached data to free storage space</p>
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Clear sensor cache? This action cannot be undone.")) {
                          localStorage.removeItem("sensor-history");
                          setCacheStats((prev) => ({ ...prev, history: 0 }));
                          setLastCleared(new Date().toISOString());
                        }
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300"
                    >
                      <Trash2 size={16} /> Clear Sensor Cache
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Clear all cached data? This action cannot be undone.")) {
                          localStorage.clear();
                          setCacheStats({ history: 0, queue: 0, events: 0, total: 0, totalKB: 0 });
                          setLastCleared(new Date().toISOString());
                        }
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300"
                    >
                      <Trash2 size={16} /> Clear All Data
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onSaveSettings}
                className="flex items-center gap-2 rounded-2xl bg-green-500 px-8 py-3 font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:bg-green-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
              >
                <Save size={18} /> {saveLabel}
              </button>
            </div>
          </div>
        </div>
      </PageContainer>
    </main>
  );
}
