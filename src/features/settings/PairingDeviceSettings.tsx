import React from 'react';
import {
  Bluetooth,
  CheckCircle2,
  KeyRound,
  Radio,
  Router,
  ShieldCheck,
  Smartphone,
  Wifi,
} from 'lucide-react';

export type PairableDevice = {
  id: string;
  name: string;
  signal: string;
  status: string;
};

type PairingDeviceSettingsProps = {
  pairingCode: string;
  expiresInSeconds: number;
  discoveredDevices: PairableDevice[];
  selectedDeviceId: string | null;
  isScanning: boolean;
  onGenerateCode: () => void;
  onScan: () => void;
  onSelectDevice: (deviceId: string) => void;
};

const pairingSteps = [
  {
    id: 'step-1',
    title: 'Aktifkan mode pairing',
    description: 'Tekan tombol pairing pada perangkat IoT selama 3 detik sampai LED berkedip.',
    icon: <Radio size={18} className="text-green-600" />,
  },
  {
    id: 'step-2',
    title: 'Hubungkan ke jaringan',
    description: 'Pastikan laptop Anda berada di jaringan Wi-Fi yang sama dengan perangkat.',
    icon: <Wifi size={18} className="text-sky-600" />,
  },
  {
    id: 'step-3',
    title: 'Verifikasi kode keamanan',
    description: 'Masukkan kode pairing agar perangkat hanya dapat diklaim oleh akun yang benar.',
    icon: <ShieldCheck size={18} className="text-amber-600" />,
  },
];

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export default function PairingDeviceSettings({
  pairingCode,
  expiresInSeconds,
  discoveredDevices,
  selectedDeviceId,
  isScanning,
  onGenerateCode,
  onScan,
  onSelectDevice,
}: PairingDeviceSettingsProps) {
  const selectedDevice = discoveredDevices.find((item) => item.id === selectedDeviceId);

  return (
    <div className="space-y-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800">
            <Bluetooth className="text-green-600" size={20} />
            Pairing Device
          </h3>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Hubungkan perangkat IoT ke dashboard untuk simulasi sebelum integrasi hardware ESP32.
          </p>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Status pairing</p>
          <p className="mt-1 text-sm font-bold text-emerald-800">
            {selectedDevice ? `Terpilih: ${selectedDevice.name}` : 'Menunggu perangkat dipilih'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">Pairing Code</p>
              <p className="text-xs text-slate-500">Kode verifikasi sementara untuk perangkat baru</p>
            </div>
            <KeyRound className="text-green-600" size={20} />
          </div>
          <div className="mt-4 rounded-xl border border-dashed border-green-200 bg-white px-4 py-5 text-center">
            <p className="text-3xl font-black tracking-[0.4em] text-slate-800">{pairingCode}</p>
            <p className="mt-2 text-xs text-slate-500">Berlaku selama {formatCountdown(expiresInSeconds)} menit</p>
          </div>
          <button
            type="button"
            onClick={onGenerateCode}
            className="mt-4 w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-700"
          >
            Generate Kode Baru
          </button>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
            <Router size={18} />
            Progres koneksi
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
            <div className={`h-full rounded-full bg-emerald-400 transition-all ${selectedDevice ? 'w-full' : 'w-2/3'}`} />
          </div>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
              <span>Mencari perangkat</span>
              <CheckCircle2 size={16} className="text-emerald-300" />
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
              <span>Validasi kode pairing</span>
              <CheckCircle2 size={16} className="text-emerald-300" />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-dashed border-white/15 px-3 py-2">
              <span>Sinkronisasi konfigurasi</span>
              <span className="text-xs font-semibold text-amber-300">
                {selectedDevice ? 'Selesai' : 'Menunggu'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">Perangkat yang terdeteksi</p>
              <p className="text-xs text-slate-500">Pilih perangkat yang ingin dihubungkan ke akun ini</p>
            </div>
            <button
              type="button"
              onClick={onScan}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              {isScanning ? 'Scanning...' : 'Scan Ulang'}
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {discoveredDevices.map((device) => {
              const selected = selectedDeviceId === device.id;
              return (
                <div
                  key={device.id}
                  className={`rounded-xl border p-4 transition-colors ${
                    selected ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-white p-2 shadow-sm">
                        <Smartphone size={18} className="text-slate-700" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{device.name}</p>
                        <p className="text-xs text-slate-500">{device.signal}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                        {device.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => onSelectDevice(device.id)}
                        className={`rounded-lg px-4 py-2 text-xs font-semibold text-white transition-colors ${
                          selected ? 'bg-green-700 hover:bg-green-800' : 'bg-slate-900 hover:bg-slate-700'
                        }`}
                      >
                        {selected ? 'Paired' : 'Pair Device'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 p-5">
          <p className="text-sm font-semibold text-slate-800">Langkah pairing</p>
          <div className="mt-4 space-y-4">
            {pairingSteps.map((step) => (
              <div key={step.id} className="flex items-start gap-3">
                <div className="mt-0.5 rounded-xl bg-slate-50 p-2">{step.icon}</div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">{step.title}</p>
                  <p className="text-xs leading-5 text-slate-500">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Default jaringan</p>
            <p className="mt-2 text-sm font-semibold text-slate-800">Smart-Clothesline-Lab</p>
            <p className="mt-1 text-xs text-slate-500">Wi-Fi mock untuk kebutuhan demo integrasi awal</p>
          </div>
        </div>
      </div>
    </div>
  );
}
