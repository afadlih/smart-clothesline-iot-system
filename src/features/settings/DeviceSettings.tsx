import { Cpu, Wifi, RefreshCw } from 'lucide-react';

type DeviceSettingsProps = {
  connectionStatus: 'ONLINE' | 'OFFLINE';
  deviceName: string;
  ipAddress: string;
  rainThreshold: number;
  lightThreshold: number;
  autoCloseOnRain: boolean;
  autoCloseOnDark: boolean;
  autoOpenWhenSafe: boolean;
  configSyncState: 'IDLE' | 'PENDING' | 'SYNCED' | 'FAILED';
  configSyncMessage: string;
  configLastSyncAt: number | null;
  updateIntervalSec: number;
  isRestarting: boolean;
  onRainThresholdChange: (value: number) => void;
  onLightThresholdChange: (value: number) => void;
  onAutoCloseOnRainChange: (value: boolean) => void;
  onAutoCloseOnDarkChange: (value: boolean) => void;
  onAutoOpenWhenSafeChange: (value: boolean) => void;
  onUpdateIntervalChange: (value: number) => void;
  onRestart: () => void;
};

export default function DeviceSettings({
  connectionStatus,
  deviceName,
  ipAddress,
  rainThreshold,
  lightThreshold,
  autoCloseOnRain,
  autoCloseOnDark,
  autoOpenWhenSafe,
  configSyncState,
  configSyncMessage,
  configLastSyncAt,
  updateIntervalSec,
  isRestarting,
  onRainThresholdChange,
  onLightThresholdChange,
  onAutoCloseOnRainChange,
  onAutoCloseOnDarkChange,
  onAutoOpenWhenSafeChange,
  onUpdateIntervalChange,
  onRestart,
}: DeviceSettingsProps) {
  const isOnline = connectionStatus === 'ONLINE';
  const rainSensitivity = rainThreshold < 1400 ? "High" : rainThreshold < 2600 ? "Medium" : "Low";
  const lightSensitivity = lightThreshold < 1600 ? "High" : lightThreshold < 2800 ? "Medium" : "Low";
  const syncClass =
    configSyncState === 'SYNCED'
      ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
      : configSyncState === 'PENDING'
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
        : configSyncState === 'FAILED'
          ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="space-y-6">
        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-slate-100">
          <Cpu className="text-green-600" size={20} />
          IoT Device Information
        </h3>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                <Wifi size={16} /> Connection Status
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
            <div className="space-y-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Config Sync</p>
                <span className={`rounded px-2 py-0.5 text-xs font-semibold ${syncClass}`}>{configSyncState}</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{configSyncMessage}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Last sync: {configLastSyncAt ? new Date(configLastSyncAt).toLocaleTimeString('en-US') : '-'}
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
              <div className="mb-1 flex justify-between">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Rain Sensitivity</label>
                <span className="text-sm font-bold text-green-600 dark:text-green-300">{rainSensitivity}</span>
              </div>
              <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">Higher sensitivity closes faster when rain starts.</p>
              <input
                type="range"
                min={200}
                max={4000}
                step={50}
                value={rainThreshold}
                onChange={(event) => onRainThresholdChange(Number(event.target.value))}
                aria-label="Rain threshold"
                title="Rain threshold"
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-green-600 dark:bg-slate-700"
              />
            </div>

            <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
              <div className="mb-1 flex justify-between">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Light Sensitivity</label>
                <span className="text-sm font-bold text-green-600 dark:text-green-300">{lightSensitivity}</span>
              </div>
              <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">Higher sensitivity reacts earlier to low light.</p>
              <input
                type="range"
                min={500}
                max={4095}
                step={50}
                value={lightThreshold}
                onChange={(event) => onLightThresholdChange(Number(event.target.value))}
                aria-label="Light threshold"
                title="Light threshold"
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-green-600 dark:bg-slate-700"
              />
            </div>
            <details className="rounded-lg border border-dashed border-slate-200 p-3 dark:border-slate-700">
              <summary className="cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-200">
                Advanced Threshold Values
              </summary>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Rain threshold: {rainThreshold} | Light threshold: {lightThreshold}
              </p>
            </details>

            <div className="grid grid-cols-1 gap-2">
              <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                <span className="text-slate-700 dark:text-slate-200">Auto close on rain</span>
                <input
                  type="checkbox"
                  checked={autoCloseOnRain}
                  className='cursor-pointer'
                  onChange={(event) => onAutoCloseOnRainChange(event.target.checked)}
                />
              </label>
              <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                <span className="text-slate-700 dark:text-slate-200">Auto close on dark</span>
                <input
                  type="checkbox"
                  checked={autoCloseOnDark}
                  className='cursor-pointer'
                  onChange={(event) => onAutoCloseOnDarkChange(event.target.checked)}
                />
              </label>
              <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                <span className="text-slate-700 dark:text-slate-200">Auto open when safe</span>
                <input
                  type="checkbox"
                  checked={autoOpenWhenSafe}
                  className='cursor-pointer'
                  onChange={(event) => onAutoOpenWhenSafeChange(event.target.checked)}
                />
              </label>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-dashed border-slate-200 p-3 dark:border-slate-700">
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <RefreshCw size={16} className="text-slate-400 dark:text-slate-500" />
                <span>Data Update Interval</span>
              </div>
              <select
                value={updateIntervalSec}
                onChange={(event) => onUpdateIntervalChange(Number(event.target.value))}
                aria-label="Interval update data"
                title="Interval update data"
                className="bg-transparent text-sm font-bold text-slate-700 outline-none dark:text-slate-200 cursor-pointer"
              >
                <option value={3} className='cursor-pointer'>3 Seconds</option>
                <option value={5} className='cursor-pointer'>5 Seconds</option>
                <option value={10} className='cursor-pointer'>10 Seconds</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={onRestart}
            disabled={isRestarting}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-100 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-900/20"
          >
            <RefreshCw size={14} className={isRestarting ? 'animate-spin' : ''} />
            {isRestarting ? 'Restarting Device...' : 'Restart Device'}
          </button>
        </div>
      </div>
    </div>
  );
}
