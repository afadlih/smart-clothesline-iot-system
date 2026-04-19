import React from 'react';
import { Cpu, Wifi, RefreshCw } from 'lucide-react';

type DeviceSettingsProps = {
  connectionStatus: 'ONLINE' | 'OFFLINE';
  deviceName: string;
  ipAddress: string;
  rainSensitivity: number;
  updateIntervalSec: number;
  isRestarting: boolean;
  onRainSensitivityChange: (value: number) => void;
  onUpdateIntervalChange: (value: number) => void;
  onRestart: () => void;
};

export default function DeviceSettings({
  connectionStatus,
  deviceName,
  ipAddress,
  rainSensitivity,
  updateIntervalSec,
  isRestarting,
  onRainSensitivityChange,
  onUpdateIntervalChange,
  onRestart,
}: DeviceSettingsProps) {
  const isOnline = connectionStatus === 'ONLINE';

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="mb-5 flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-slate-100">
        <Cpu className="text-green-600" size={20} />
        Informasi Perangkat IoT
      </h3>

      <div className="space-y-4">
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
              <Wifi size={16} /> Status Koneksi
            </span>
            <span
              className={`rounded-md px-2 py-1 text-xs font-bold ${
                isOnline
                  ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300'
              }`}
            >
              {connectionStatus}
            </span>
          </div>
          <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
            {deviceName} ({ipAddress})
          </p>
        </div>

        <div className="space-y-4 pt-2">
          <div>
            <div className="mb-1 flex justify-between">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Rain Sensor Sensitivity</label>
              <span className="text-sm font-bold text-green-600 dark:text-green-300">{rainSensitivity}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              value={rainSensitivity}
              onChange={(event) => onRainSensitivityChange(Number(event.target.value))}
              aria-label="Rain sensor sensitivity"
              title="Rain sensor sensitivity"
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-green-600 dark:bg-slate-700"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-dashed border-slate-200 p-3 dark:border-slate-700">
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <RefreshCw size={16} className="text-slate-400 dark:text-slate-500" />
              <span>Interval Update Data</span>
            </div>
            <select
              value={updateIntervalSec}
              onChange={(event) => onUpdateIntervalChange(Number(event.target.value))}
              aria-label="Interval update data"
              title="Interval update data"
              className="bg-transparent text-sm font-bold text-slate-700 outline-none dark:text-slate-200"
            >
              <option value={3}>3 Detik</option>
              <option value={5}>5 Detik</option>
              <option value={10}>10 Detik</option>
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={onRestart}
          disabled={isRestarting}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-red-100 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-900/20"
        >
          <RefreshCw size={14} className={isRestarting ? 'animate-spin' : ''} />
          {isRestarting ? 'Merestart Perangkat...' : 'Restart Perangkat'}
        </button>
      </div>
    </div>
  );
}
