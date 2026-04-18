import React from 'react';
import { Calendar, Clock, Plus, Trash2, Power, AlertCircle } from 'lucide-react';

// Jika nanti pakai data real, ini bisa dipindah ke types.ts
interface ScheduleItem {
  id: number;
  name: string;
  timeOpen: string;
  timeClose: string;
  isActive: boolean;
}

export default function SchedulePage() {
  const schedules: ScheduleItem[] = [
    { id: 1, name: 'Jemur Pagi Rutin', timeOpen: '08:00', timeClose: '11:00', isActive: true },
    { id: 2, name: 'Jemur Ulang Siang', timeOpen: '13:00', timeClose: '15:30', isActive: false },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Penjadwalan Otomatis</h1>
          <p className="text-slate-500 text-sm">Atur waktu operasional jemuran pintar Anda</p>
        </div>
        <button className="flex items-center gap-2 bg-[#22C55E] hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm">
          <Plus size={18} /> Tambah Jadwal
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Schedule List */}
        <div className="lg:col-span-2 space-y-4">
          {schedules.map((schedule) => (
            <div 
              key={schedule.id} 
              className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-green-200 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${schedule.isActive ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-400'}`}>
                  <Clock size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{schedule.name}</h3>
                  <div className="flex items-center gap-3 mt-1 text-sm">
                    <span className="text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded text-xs">
                      {schedule.timeOpen}
                    </span>
                    <span className="text-slate-300">—</span>
                    <span className="text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded text-xs">
                      {schedule.timeClose}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className={`p-2 rounded-lg border transition-colors ${schedule.isActive ? 'text-green-600 bg-green-50 border-green-100' : 'text-slate-400 border-slate-100'}`}>
                  <Power size={18} />
                </button>
                <button className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Info / Control Panel */}
        <div className="space-y-6">
          {/* Smart Logic Card */}
          <div className="bg-[#0F172A] text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-green-400 mb-4">
                <AlertCircle size={20} />
                <h3 className="font-semibold">Sistem Prioritas</h3>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed mb-6">
                Jadwal akan otomatis <strong>ditangguhkan</strong> jika sensor mendeteksi hujan demi keamanan jemuran.
              </p>
              <div className="bg-white/10 p-4 rounded-xl border border-white/10">
                <div className="flex justify-between items-center text-sm">
                  <span>Auto-Override</span>
                  <span className="bg-green-500 text-[10px] px-2 py-1 rounded font-bold">AKTIF</span>
                </div>
              </div>
            </div>
            {/* Dekorasi elemen abstrak biar menarik */}
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-green-500/10 rounded-full blur-2xl"></div>
          </div>

          {/* Guide Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wider">Tips</h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0"></div>
                <p className="text-sm text-slate-500 italic">"Hindari menjadwalkan di atas jam 5 sore untuk mencegah embun."</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}