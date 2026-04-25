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
    title: 'Enable pairing mode',
    description: 'Hold the pairing button on the IoT device for 3 seconds until the LED blinks.',
    icon: <Radio size={18} className="text-green-600" />,
  },
  {
    id: 'step-2',
    title: 'Connect to network',
    description: 'Ensure your laptop is on the same Wi-Fi network as the device.',
    icon: <Wifi size={18} className="text-sky-600" />,
  },
  {
    id: 'step-3',
    title: 'Verify security code',
    description: 'Enter the pairing code so the device can only be claimed by the correct account.',
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
    <div className="space-y-8 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-slate-100">
            <Bluetooth className="text-green-600" size={20} />
            Pairing Device
          </h3>
          <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Connect IoT devices to the dashboard for simulation before full ESP32 hardware integration.
          </p>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Pairing status</p>
          <p className="mt-1 text-sm font-bold text-emerald-800">
            {selectedDevice ? `Selected: ${selectedDevice.name}` : 'Waiting for device selection'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Pairing Code</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Temporary verification code for a new device</p>
            </div>
            <KeyRound className="text-green-600" size={20} />
          </div>
          <div className="mt-4 rounded-xl border border-dashed border-green-200 bg-white px-4 py-5 text-center dark:border-green-900/40 dark:bg-slate-900">
            <p className="text-3xl font-black tracking-[0.4em] text-slate-800 dark:text-slate-100">{pairingCode}</p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Valid for {formatCountdown(expiresInSeconds)} minutes</p>
          </div>
          <button
            type="button"
            onClick={onGenerateCode}
            className="mt-4 w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-700"
          >
            Generate New Code
          </button>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
            <Router size={18} />
            Connection progress
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
            <div className={`h-full rounded-full bg-emerald-400 transition-all ${selectedDevice ? 'w-full' : 'w-2/3'}`} />
          </div>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
              <span>Scanning devices</span>
              <CheckCircle2 size={16} className="text-emerald-300" />
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
              <span>Validate pairing code</span>
              <CheckCircle2 size={16} className="text-emerald-300" />
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
              <span>Configuration sync</span>
              <span className="text-xs font-semibold text-amber-300">
                {selectedDevice ? 'Completed' : 'Waiting'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-100 p-5 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Detected devices</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Choose the device you want to connect to this account</p>
            </div>
            <button
              type="button"
              onClick={onScan}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {isScanning ? 'Scanning...' : 'Scan Again'}
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {discoveredDevices.map((device) => {
              const selected = selectedDeviceId === device.id;
              return (
                <div
                  key={device.id}
                  className={`rounded-xl border p-4 transition-colors ${
                    selected
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
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{device.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{device.signal}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
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

        <div className="rounded-2xl border border-slate-100 p-5 dark:border-slate-800">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Pairing steps</p>
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

          <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Default network</p>
            <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-100">Smart-Clothesline-Lab</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Mock Wi-Fi for initial integration demos</p>
          </div>
        </div>
      </div>
    </div>
  );
}
