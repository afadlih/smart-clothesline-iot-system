import type { SystemMode } from "@/features/system/SystemModeManager";

type Props = {
  controlMode: SystemMode;
  activeStartHour: number;
  activeEndHour: number;
  onControlModeChange: (mode: SystemMode) => void;
  onActiveStartHourChange: (value: number) => void;
  onActiveEndHourChange: (value: number) => void;
};

export default function SystemControlSettings({
  controlMode,
  activeStartHour,
  activeEndHour,
  onControlModeChange,
  onActiveStartHourChange,
  onActiveEndHourChange,
}: Props) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="mb-4 text-lg font-bold text-slate-800 dark:text-slate-100">Control & Schedule</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Control Mode</label>
          <select
            value={controlMode}
            onChange={(event) => onControlModeChange(event.target.value as SystemMode)}
            aria-label="Mode kontrol sistem"
            title="Mode kontrol sistem"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm text-slate-900 outline-none focus:border-green-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="AUTO">AUTO</option>
            <option value="MANUAL">MANUAL</option>
            <option value="SCHEDULE">SCHEDULE</option>
          </select>
        </div>
        <div>
          <label
            htmlFor="activeStartHour"
            className="mb-1 block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400"
          >
            Active Start Hour
          </label>
          <input
            id="activeStartHour"
            type="number"
            min={0}
            max={23}
            value={activeStartHour}
            onChange={(event) => onActiveStartHourChange(Number(event.target.value))}
            aria-label="Active start hour"
            title="Active start hour"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm text-slate-900 outline-none focus:border-green-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>
        <div>
          <label
            htmlFor="activeEndHour"
            className="mb-1 block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400"
          >
            Active End Hour
          </label>
          <input
            id="activeEndHour"
            type="number"
            min={0}
            max={23}
            value={activeEndHour}
            onChange={(event) => onActiveEndHourChange(Number(event.target.value))}
            aria-label="Active end hour"
            title="Active end hour"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm text-slate-900 outline-none focus:border-green-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>
      </div>
      <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
        Pengaturan mode dan jadwal dipisahkan dari tab profil agar tidak tercampur dengan data user.
      </p>
    </div>
  );
}
