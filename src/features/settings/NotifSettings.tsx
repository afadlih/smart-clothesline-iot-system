import React from 'react';
import { Bell, Mail, Smartphone } from 'lucide-react';

export type NotificationPreference = {
  rain: boolean;
  dry: boolean;
  report: boolean;
  whatsapp: boolean;
};

type NotificationSettingsProps = {
  value: NotificationPreference;
  onToggle: (key: keyof NotificationPreference) => void;
  whatsappNumber: string;
  onWhatsAppNumberChange: (value: string) => void;
};

export default function NotificationSettings({
  value,
  onToggle,
  whatsappNumber,
  onWhatsAppNumberChange,
}: NotificationSettingsProps) {
  const settings = [
    {
      id: 'rain' as const,
      label: 'Rain Alert',
      desc: 'Notify when rain is detected',
      icon: <Bell size={18} />,
    },
    {
      id: 'dry' as const,
      label: 'Clothes Dry',
      desc: 'Notify when humidity drops',
      icon: <Smartphone size={18} />,
    },
    {
      id: 'report' as const,
      label: 'Daily Report',
      desc: 'Evening summary of clothesline activity',
      icon: <Mail size={18} />,
    },
    {
      id: 'whatsapp' as const,
      label: 'WhatsApp Notification',
      desc: 'Planned cloud notification channel via WhatsApp',
      icon: <Smartphone size={18} />,
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="mb-5 flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-slate-100">
        <Bell className="text-green-600" size={20} />
        Notification Settings
      </h3>

      <div className="space-y-6">
        {settings.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-1 text-slate-400 dark:text-slate-500">{item.icon}</div>
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{item.label}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
              </div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={value[item.id]}
                onChange={() => onToggle(item.id)}
                aria-label={item.label}
                title={item.label}
                className="peer sr-only"
              />
              <div className="h-6 w-11 rounded-full bg-slate-200 transition-all after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-green-600 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-slate-700 dark:after:border-slate-500 dark:after:bg-slate-100" />
            </label>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-900/20">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Integration Roadmap</p>
        <p className="mt-1 text-sm font-semibold text-emerald-800 dark:text-emerald-200">Channel WhatsApp (Planned)</p>
        <p className="mt-1 text-xs leading-relaxed text-emerald-700 dark:text-emerald-300/90">
          The next phase will enable WhatsApp notifications after cloud backend and API credentials are ready.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-300">
              Destination WhatsApp Number
            </label>
            <input
              type="tel"
              value={whatsappNumber}
              onChange={(event) => onWhatsAppNumberChange(event.target.value)}
              placeholder="Example: +628123456789"
              aria-label="WhatsApp notification number"
              title="WhatsApp notification number"
              className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-emerald-900 outline-none focus:border-emerald-500 dark:border-emerald-900/40 dark:bg-slate-950 dark:text-emerald-100"
            />
          </div>
          <span className="inline-flex rounded-md bg-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
            API Not Active Yet
          </span>
        </div>
      </div>
    </div>
  );
}
