"use client";

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { User, Bell, Smartphone, Save, BluetoothSearching } from 'lucide-react';
import NotificationSettings, { type NotificationPreference } from './NotifSettings';
import DeviceSettings from './DeviceSettings';
import PairingDeviceSettings, { type PairableDevice } from './PairingDeviceSettings';
import { useSensor } from '@/hooks/useSensor';

type TabId = 'profile' | 'notification' | 'device' | 'pairing';

type AppSettings = {
  profileName: string;
  notification: NotificationPreference;
  whatsappNumber: string;
  rainSensitivity: number;
  updateIntervalSec: number;
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
  rainSensitivity: 75,
  updateIntervalSec: 5,
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
  const { sensor } = useSensor();
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [saveLabel, setSaveLabel] = useState('Simpan Perubahan');
  const [isRestarting, setIsRestarting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [pairingCode, setPairingCode] = useState(generatePairingCode());
  const [expiresInSeconds, setExpiresInSeconds] = useState(300);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [devices, setDevices] = useState<PairableDevice[]>(initialDevices);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'profile' || tab === 'notification' || tab === 'device' || tab === 'pairing') {
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
        rainSensitivity: parsed.rainSensitivity ?? defaultSettings.rainSensitivity,
        updateIntervalSec: parsed.updateIntervalSec ?? defaultSettings.updateIntervalSec,
      });
    } catch {
      localStorage.removeItem(SETTINGS_STORAGE_KEY);
    }
  }, []);

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

  const onSaveSettings = () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
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

  const connectionStatus: 'ONLINE' | 'OFFLINE' = sensor ? 'ONLINE' : 'OFFLINE';

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
            { id: 'pairing' as const, label: 'Pairing Device', icon: <BluetoothSearching size={18} /> },
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
              rainSensitivity={settings.rainSensitivity}
              updateIntervalSec={settings.updateIntervalSec}
              isRestarting={isRestarting}
              onRainSensitivityChange={(value) =>
                setSettings((prev) => ({
                  ...prev,
                  rainSensitivity: value,
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

          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={onSaveSettings}
              className="flex items-center gap-2 rounded-2xl bg-[#22C55E] px-8 py-3 font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:bg-green-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
            >
              <Save size={18} /> {saveLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
