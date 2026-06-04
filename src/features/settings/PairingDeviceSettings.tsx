import React from 'react';
import {
  Bluetooth,
  CheckCircle2,
  Radio,
  Router,
  CheckCheck,
  Smartphone,
  Wifi,
} from 'lucide-react';

export type PairableDevice = {
  id: string;
  name: string;
  signal: string;
  status: string;
  source?: "wokwi" | "esp32";
  pairingCode?: string;
  ipAddress?: string;
  lastSeenAt?: number;
};

type PairingDeviceSettingsProps = {
  discoveredDevices: PairableDevice[];
  selectedDeviceId: string | null;
  activeDeviceStatus: "online" | "delayed" | "offline" | "unknown";
  isScanning: boolean;
  onScan: () => void;
  onSelectDevice: (deviceId: string) => void;
  lang?: "en" | "id";
};

export default function PairingDeviceSettings({
  discoveredDevices,
  selectedDeviceId,
  activeDeviceStatus,
  isScanning,
  onScan,
  onSelectDevice,
  lang = "en",
}: PairingDeviceSettingsProps) {
  const t = (en: string, id: string) => (lang === "id" ? id : en);

  const selectedDevice = discoveredDevices.find((item) => item.id === selectedDeviceId);
  const activeStatusLabel =
    activeDeviceStatus === "online"
      ? "Online"
      : activeDeviceStatus === "delayed"
        ? "Delayed"
        : activeDeviceStatus === "offline"
          ? "Offline"
          : "Unknown";

  const getDeviceStatusLabel = (status: string) => {
    const s = status.toLowerCase();
    if (s === "online") return t("Online", "Terhubung");
    if (s === "offline") return t("Offline", "Terputus");
    if (s === "delayed") return t("Delayed", "Terlambat");
    if (s === "found") return t("Found", "Ditemukan");
    if (s === "pairable") return t("Pairable", "Siap Dihubungkan");
    if (s === "unknown") return t("Unknown", "Tidak Diketahui");
    return status;
  };

  const getSignalLabel = (signal: string) => {
    if (signal === "Paired device") return t("Paired device", "Alat terpasang");
    if (signal === "ESP32 discovery") return t("ESP32 discovery", "Penemuan ESP32");
    return signal;
  };

  const pairingSteps = [
    {
      id: 'step-1',
      title: t('Connect your device to your Wi-Fi', 'Hubungkan alat Anda ke Wi-Fi'),
      description: t('After pluging in the power cable, connect your laptop to the device hotspot, and open http://192.168.4.1 in your web browser', 'Setelah menyambungkan kabel daya, hubungkan laptop ke hotspot alat, lalu buka http://192.168.4.1 di browser Anda'),
      icon: <Radio size={18} className="text-green-600" />,
    },
    {
      id: 'step-2',
      title: t('Pair clothesline device', 'Hubungkan alat jemuran'),
      description: t('After your device connected to the internet it will show up to the pairable device, then click "Pair Device"', 'Setelah alat terhubung ke internet, alat akan muncul di daftar alat, lalu klik "Hubungkan Alat"'),
      icon: <Wifi size={18} className="text-sky-600" />,
    },
    {
      id: 'step-3',
      title: t('Device is ready to use', 'Alat siap digunakan'),
      description: t('Now you have automated clothesline installed in your home', 'Sekarang Anda memiliki jemuran otomatis terpasang di rumah Anda'),
      icon: <CheckCheck size={18} className="text-amber-600" />,
    },
  ];

  return (
    <div className="space-y-8 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-slate-100">
            <Bluetooth className="text-green-600" size={20} />
            {t("Pairing Device", "Menghubungkan Alat")}
          </h3>
          <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            {t("Connect IoT devices to the dashboard for simulation before full ESP32 hardware integration.", "Hubungkan alat IoT ke dasbor untuk simulasi sebelum integrasi perangkat keras ESP32 penuh.")}
          </p>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{t("Pairing status", "Status pairing")}</p>
          <p className="mt-1 text-sm font-bold text-emerald-800">
            {selectedDevice ? `${t("Selected:", "Terpilih:")} ${selectedDevice.name}` : t("Waiting for device selection", "Menunggu pilihan alat")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t("Connected Device", "Alat Terhubung")}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t("Current active device for this dashboard", "Alat aktif saat ini untuk dasbor")}</p>
            </div>
            <Smartphone className="text-green-600" size={20} />
          </div>

          <div className="mt-4 rounded-xl border border-dashed border-green-200 bg-white px-4 py-5 dark:border-green-900/40 dark:bg-slate-900">
            {selectedDevice ? (
              <div className="space-y-3">
                <div>
                  <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{selectedDevice.name}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{selectedDevice.id}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedDevice.source && (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {selectedDevice.source}
                    </span>
                  )}
                  <span className={activeStatusLabel.toLowerCase() === "offline" ? `rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300` : `rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300`}>
                    {getDeviceStatusLabel(activeStatusLabel)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  {t("No device connected yet.", "Belum ada alat yang terhubung.")}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {t(
                    "Start the simulator or turn on your ESP32 device, then pair it here.",
                    "Jalankan simulator atau nyalakan ESP32, lalu lakukan pairing di sini."
                  )}
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onScan}
            className="mt-4 w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-700"
          >
            {isScanning ? t("Scanning...", "Memindai...") : t("Refresh Discovery", "Perbarui Pencarian")}
          </button>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
            <Router size={18} />
            {t("Connection progress", "Kemajuan koneksi")}
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
            <div className={`h-full rounded-full bg-emerald-400 transition-all ${selectedDevice ? 'w-full' : 'w-2/3'}`} />
          </div>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
              <span>{t("Scanning devices", "Memindai alat")}</span>
              <CheckCircle2 size={16} className="text-emerald-300" />
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
              <span>{t("Validate pairing code", "Validasi kode pairing")}</span>
              <CheckCircle2 size={16} className="text-emerald-300" />
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
              <span>{t("Configuration sync", "Sinkronisasi konfigurasi")}</span>
              <span className="text-xs font-semibold text-amber-300">
                {selectedDevice ? t("Completed", "Selesai") : t("Waiting", "Menunggu")}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-100 p-5 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t("Detected devices", "Alat terdeteksi")}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t("Choose the device you want to connect to this account", "Pilih alat yang ingin Anda hubungkan ke akun ini")}</p>
            </div>
            <button
              type="button"
              onClick={onScan}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {isScanning ? t("Scanning...", "Memindai...") : t("Refresh", "Segarkan")}
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {discoveredDevices.map((device) => {
              const selected = selectedDeviceId === device.id;
              const deviceStatus =
                selected
                  ? activeStatusLabel
                  : device.lastSeenAt
                    ? "Found"
                    : "Unknown";
              return (
                <div
                  key={device.id}
                  className={`rounded-xl border p-4 transition-colors ${selected
                    ? 'border-green-200 bg-green-50 dark:border-green-900/40 dark:bg-green-900/20'
                    : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60'
                    }`}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-white p-2 shadow-sm dark:bg-slate-900">
                        <Smartphone size={18} className="text-slate-700 dark:text-slate-200" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{device.name}</p>
                          {device.source && (
                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                              {device.source}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-400">{getSignalLabel(device.signal)}</p>

                        {device.pairingCode && (
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {t("Password: ", "Kata Sandi: ")}{device.pairingCode}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                        {getDeviceStatusLabel(deviceStatus)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onSelectDevice(device.id)}
                        className={`rounded-lg px-4 py-2 text-xs font-semibold text-white transition-colors ${selected ? 'bg-green-700 hover:bg-green-800' : 'bg-slate-900 hover:bg-slate-700'
                          }`}
                      >
                        {selected ? t("Paired", "Terhubung") : t("Pair Device", "Hubungkan Alat")}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 p-5 dark:border-slate-800">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t("Pairing steps", "Langkah pairing")}</p>
          <div className="mt-4 space-y-4">
            {pairingSteps.map((step) => (
              <div key={step.id} className="flex items-start gap-3">
                <div className="mt-0.5 rounded-xl bg-slate-50 p-2 dark:bg-slate-800">{step.icon}</div>
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{step.title}</p>
                  <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Default network</p>
            <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-100">Smart-Clothesline-Lab</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Mock Wi-Fi for initial integration demos</p>
          </div> */}
        </div>
      </div>
    </div>
  );
}
