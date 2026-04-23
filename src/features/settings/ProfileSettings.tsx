"use client";

import React, { useEffect, useState } from 'react';
import { useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { User, Bell, Smartphone, Save, BluetoothSearching, HardDrive, Download, Trash2 } from 'lucide-react';
import NotificationSettings, { type NotificationPreference } from './NotifSettings';
import DeviceSettings from './DeviceSettings';
import PairingDeviceSettings, { type PairableDevice } from './PairingDeviceSettings';
import SystemControlSettings from './SystemControlSettings';
import { systemModeManager, type SystemMode } from '@/features/system/SystemModeManager';
import { useSensor } from '@/hooks/useSensor';
import { FirestoreService } from '@/services/FirestoreService';
import { DataExportService } from '@/services/DataExportService';

type TabId = 'profile' | 'notification' | 'device' | 'pairing' | 'system' | 'data-management';

type AppSettings = {
  profileName: string;
  notification: NotificationPreference;
  whatsappNumber: string;
  rainThreshold: number;
  lightThreshold: number;
  autoCloseOnRain: boolean;
  autoCloseOnDark: boolean;
  updateIntervalSec: number;
  controlMode: SystemMode;
  activeStartHour: number;
  activeEndHour: number;
};

const SETTINGS_STORAGE_KEY = 'smart-clothesline-settings-v1';
const DEVICES_STORAGE_KEY = 'smart-clothesline-devices-v1';

const defaultSettings: AppSettings = {
  profileName: 'Salsa',
  notification: {
    rain: true,
    dry: true,
    report: false,
    whatsapp: false,
  },
  whatsappNumber: '',
  rainThreshold: 2000,
  lightThreshold: 3000,
  autoCloseOnRain: true,
  autoCloseOnDark: true,
  updateIntervalSec: 5,
  controlMode: 'AUTO',
  activeStartHour: 8,
  activeEndHour: 17,
};

const initialDevices: PairableDevice[] = [
  {
    id: 'esp32-01',
    name: 'ESP32 Clothesline Hub',
    signal: 'Sinyal kuat',
    status: 'Direkomendasikan',
  },
  {
    id: 'node-mcu-backup',
    name: 'NodeMCU Backup Unit',
    signal: 'Sinyal sedang',
    status: 'Tersedia',
  },
];

function generatePairingCode(): string {
  const random = Math.floor(1000 + Math.random() * 9000);
  return `SCI-${random}`;
}

export default function SettingsScreen() {
  const searchParams = useSearchParams();
  const { sensor, isOnline, publishConfig, deviceConfig, history } = useSensor();
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [saveLabel, setSaveLabel] = useState('Simpan Perubahan');
  const [isRestarting, setIsRestarting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [pairingCode, setPairingCode] = useState(generatePairingCode());
  const [expiresInSeconds, setExpiresInSeconds] = useState(300);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [devices, setDevices] = useState<PairableDevice[]>(initialDevices);
  const didHydrateRef = useRef(false);
  const [cacheStats, setCacheStats] = useState({ history: 0, queue: 0, events: 0, total: 0, totalKB: 0 });
  const [lastCleared, setLastCleared] = useState<string | null>(null);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'profile' || tab === 'notification' || tab === 'device' || tab === 'pairing' || tab === 'system' || tab === 'data-management') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as AppSettings;
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
        controlMode:
          parsed.controlMode === 'AUTO' ||
          parsed.controlMode === 'MANUAL' ||
          parsed.controlMode === 'SCHEDULE'
            ? parsed.controlMode
            : defaultSettings.controlMode,
        activeStartHour: parsed.activeStartHour ?? defaultSettings.activeStartHour,
        activeEndHour: parsed.activeEndHour ?? defaultSettings.activeEndHour,
      });
    } catch {
      localStorage.removeItem(SETTINGS_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    systemModeManager.setMode(settings.controlMode);
  }, [settings.controlMode]);

  useEffect(() => {
    if (!didHydrateRef.current) {
      didHydrateRef.current = true;
      return;
    }

    const timer = window.setTimeout(() => {
      publishConfig({
        rainThreshold: settings.rainThreshold,
        lightThreshold: settings.lightThreshold,
        autoCloseOnRain: settings.autoCloseOnRain,
        autoCloseOnDark: settings.autoCloseOnDark,
      });
    }, 400);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    publishConfig,
    settings.autoCloseOnDark,
    settings.autoCloseOnRain,
    settings.lightThreshold,
    settings.rainThreshold,
  ]);

  useEffect(() => {
    const raw = localStorage.getItem(DEVICES_STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as {
        devices?: PairableDevice[];
        selectedDeviceId?: string | null;
      };

      if (Array.isArray(parsed.devices)) {
        setDevices(
          parsed.devices.filter(
            (device) =>
              typeof device.id === 'string' &&
              typeof device.name === 'string' &&
              typeof device.signal === 'string' &&
              typeof device.status === 'string',
          ),
        );
      }

      if (typeof parsed.selectedDeviceId === 'string' || parsed.selectedDeviceId === null) {
        setSelectedDeviceId(parsed.selectedDeviceId ?? null);
      }
    } catch {
      localStorage.removeItem(DEVICES_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      DEVICES_STORAGE_KEY,
      JSON.stringify({
        devices,
        selectedDeviceId,
      }),
    );
  }, [devices, selectedDeviceId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setExpiresInSeconds((prev) => {
        if (prev <= 1) {
          return 300;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  // Load cache stats on mount and when component becomes visible
  useEffect(() => {
    const refreshCacheStats = () => {
      const stats = DataExportService.getCacheStats();
      setCacheStats(stats);
    };

    refreshCacheStats();

    // Refresh every 5 seconds
    const interval = window.setInterval(refreshCacheStats, 5000);
    return () => window.clearInterval(interval);
  }, []);

  const onSaveSettings = () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    void FirestoreService.saveSystemSettings({
      controlMode: settings.controlMode,
      activeStartHour: settings.activeStartHour,
      activeEndHour: settings.activeEndHour,
    }).catch((error) => {
      console.error('[Firestore] Failed to save system settings:', error);
    });
    setSaveLabel('Tersimpan');
    window.setTimeout(() => {
      setSaveLabel('Simpan Perubahan');
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
      setDevices((prev) => {
        const nextScanDevice: PairableDevice = {
          id: `esp32-scan-${Date.now()}`,
          name: 'ESP32 Clothesline Scan Result',
          signal: 'Sinyal baru terdeteksi',
          status: 'Baru',
        };

        return [nextScanDevice, ...prev].slice(0, 5);
      });
      setIsScanning(false);
    }, 1200);
  };

  const connectionStatus: 'ONLINE' | 'OFFLINE' = isOnline ? 'ONLINE' : 'OFFLINE';

  return (
    <div className="flex min-h-screen max-w-5xl flex-col gap-6 bg-gradient-to-br from-gray-100 to-gray-200 p-6 text-slate-900 transition-colors duration-300 dark:from-slate-900 dark:to-slate-950 dark:text-slate-100">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Konfigurasi sistem Smart Clothesline Anda</p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
        <div className="flex flex-col gap-1">
          {[
            { id: 'profile' as const, label: 'Profil', icon: <User size={18} /> },
            { id: 'notification' as const, label: 'Notifikasi', icon: <Bell size={18} /> },
            { id: 'device' as const, label: 'Perangkat IoT', icon: <Smartphone size={18} /> },
            { id: 'system' as const, label: 'Control & Jadwal', icon: <Save size={18} /> },
            { id: 'pairing' as const, label: 'Pairing Device', icon: <BluetoothSearching size={18} /> },
            { id: 'data-management' as const, label: 'Data Management', icon: <HardDrive size={18} /> },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                activeTab === item.id
                  ? 'bg-green-600 text-white shadow-md'
                    : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>

        <div className="space-y-6 md:col-span-3">
          {activeTab === 'profile' && (
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="mb-4 text-lg font-bold text-slate-800 dark:text-slate-100">Informasi Profil</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Nama</label>
                  <input
                    type="text"
                    value={settings.profileName}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        profileName: event.target.value,
                      }))
                    }
                    placeholder="Masukkan nama"
                    aria-label="Nama profil"
                    title="Nama profil"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm text-slate-900 outline-none focus:border-green-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Role</label>
                  <input
                    type="text"
                    value="Operator Dashboard"
                    disabled
                    aria-label="Role pengguna"
                    title="Role pengguna"
                    className="w-full rounded-lg border border-slate-200 bg-slate-100 p-2.5 text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notification' && (
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

          {activeTab === 'device' && (
            <DeviceSettings
              connectionStatus={connectionStatus}
              deviceName="ESP32-STATION-01"
              ipAddress={sensor ? '192.168.1.42' : 'Tidak terdeteksi'}
              rainThreshold={settings.rainThreshold}
              lightThreshold={settings.lightThreshold}
              autoCloseOnRain={settings.autoCloseOnRain}
              autoCloseOnDark={settings.autoCloseOnDark}
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
              onRestart={onRestartDevice}
            />
          )}

          {activeTab === 'system' && (
            <SystemControlSettings
              controlMode={settings.controlMode}
              activeStartHour={settings.activeStartHour}
              activeEndHour={settings.activeEndHour}
              onControlModeChange={(value) =>
                setSettings((prev) => ({
                  ...prev,
                  controlMode: value,
                }))
              }
              onActiveStartHourChange={(value) =>
                setSettings((prev) => ({
                  ...prev,
                  activeStartHour: value,
                }))
              }
              onActiveEndHourChange={(value) =>
                setSettings((prev) => ({
                  ...prev,
                  activeEndHour: value,
                }))
              }
            />
          )}

          {activeTab === 'pairing' && (
            <PairingDeviceSettings
              pairingCode={pairingCode}
              expiresInSeconds={expiresInSeconds}
              discoveredDevices={devices}
              selectedDeviceId={selectedDeviceId}
              isScanning={isScanning}
              onGenerateCode={() => {
                setPairingCode(generatePairingCode());
                setExpiresInSeconds(300);
              }}
              onScan={onScanDevices}
              onSelectDevice={(deviceId) => setSelectedDeviceId(deviceId)}
            />
          )}

          {activeTab === 'data-management' && (
            <div className="space-y-6">
              {/* Export Section */}
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h3 className="mb-4 text-lg font-bold text-slate-800 dark:text-slate-100">Export Sensor Data</h3>
                <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">Download your sensor data in CSV or JSON format</p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => {
                      DataExportService.exportLastNDays(
                        history.map((h) => h.data),
                        7,
                        'csv'
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
                        'csv'
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
                        `clothesline-all-${new Date().toISOString().split('T')[0]}.json`
                      );
                    }}
                    className="flex items-center justify-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700 transition hover:bg-green-100 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-300"
                  >
                    <Download size={16} /> All Data (JSON)
                  </button>
                </div>
              </div>

              {/* Storage Statistics */}
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
                    Last cleared: {new Date(lastCleared).toLocaleString('id-ID')}
                  </p>
                )}
              </div>

              {/* Cache Management */}
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h3 className="mb-4 text-lg font-bold text-slate-800 dark:text-slate-100">Cache Management</h3>
                <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">Clear cached data to free up storage space</p>
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Clear sensor cache? This action cannot be undone.')) {
                        localStorage.removeItem('sensor-history');
                        setCacheStats((prev) => ({ ...prev, history: 0 }));
                        setLastCleared(new Date().toISOString());
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300"
                  >
                    <Trash2 size={16} /> Clear Sensor Cache
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Clear all cached data? This action cannot be undone.')) {
                        localStorage.clear();
                        setCacheStats({ history: 0, queue: 0, events: 0, total: 0, totalKB: 0 });
                        setLastCleared(new Date().toISOString());
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300"
                  >
                    <Trash2 size={16} /> Clear All Data
                  </button>
                </div>
              </div>

              {/* Data Privacy */}
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h3 className="mb-4 text-lg font-bold text-slate-800 dark:text-slate-100">Data Privacy</h3>
                <div className="space-y-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Your Data Rights</p>
                    <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                      You have the right to access, download, and delete your personal data at any time. All sensor data is stored locally and synced to our secure servers with encryption.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      DataExportService.exportToJSON(
                        history.map((h) => h.data),
                        `my-data-${new Date().toISOString().split('T')[0]}.json`
                      );
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    <Download size={16} /> Download My Data (GDPR)
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4">
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
    </div>
  );
}
