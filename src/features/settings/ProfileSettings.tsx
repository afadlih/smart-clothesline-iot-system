"use client"; // Tambahkan ini karena kita akan pakai useState

import React, { useState } from 'react';
import { User, Bell, Smartphone, Save } from 'lucide-react';
import NotificationSettings from './NotifSettings';
import DeviceSettings from './DeviceSettings';

export default function SettingsScreen() {
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <p className="text-slate-500 text-sm">Konfigurasi sistem Smart Clothesline Anda</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Menu Samping */}
        <div className="flex flex-col gap-1">
          {[
            { id: 'profile', label: 'Profil', icon: <User size={18} /> },
            { id: 'notification', label: 'Notifikasi', icon: <Bell size={18} /> },
            { id: 'device', label: 'Perangkat IoT', icon: <Smartphone size={18} /> },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === item.id 
                  ? 'bg-green-600 text-white shadow-md' 
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>

        {/* Area Konten Dinamis */}
        <div className="md:col-span-3 space-y-6">
          {activeTab === 'profile' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Informasi Profil</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Nama</label>
                    <input type="text" defaultValue="Salsa" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Role</label>
                    <input type="text" defaultValue="Admin / Owner" disabled className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-400" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notification' && <NotificationSettings />}
          
          {activeTab === 'device' && <DeviceSettings />}

          {/* Tombol Simpan Terpadu */}
          <div className="flex justify-end pt-4">
            <button className="flex items-center gap-2 bg-[#22C55E] hover:bg-green-700 text-white px-8 py-3 rounded-2xl font-bold transition-all shadow-lg hover:scale-[1.02]">
              <Save size={18} /> Simpan Perubahan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}