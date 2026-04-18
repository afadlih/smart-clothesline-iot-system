import React from 'react';
import { Bell, Mail, MessageSquare, Smartphone } from 'lucide-react';

export default function NotificationSettings() {
  const settings = [
    { id: 'rain', label: 'Peringatan Hujan', desc: 'Notifikasi saat hujan terdeteksi', icon: <Bell size={18} />, active: true },
    { id: 'dry', label: 'Jemuran Kering', desc: 'Notifikasi saat sensor mendeteksi kelembapan rendah', icon: <Smartphone size={18} />, active: true },
    { id: 'report', label: 'Laporan Harian', desc: 'Ringkasan aktivitas jemuran setiap sore', icon: <Mail size={18} />, active: false },
  ];

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
      <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
        <Bell className="text-green-600" size={20} />
        Pengaturan Notifikasi
      </h3>
      
      <div className="space-y-6">
        {settings.map((item) => (
          <div key={item.id} className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-1 text-slate-400">{item.icon}</div>
              <div>
                <p className="font-medium text-slate-800 text-sm">{item.label}</p>
                <p className="text-xs text-slate-500">{item.desc}</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={item.active} className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}