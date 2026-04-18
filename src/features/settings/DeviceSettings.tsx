import React from 'react';
import { Cpu, Wifi, RefreshCw, Database } from 'lucide-react';

export default function DeviceSettings() {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
      <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
        <Cpu className="text-green-600" size={20} />
        Informasi Perangkat IoT
      </h3>

      <div className="space-y-4">
        {/* Status Koneksi */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Wifi size={16} /> Status Koneksi
            </span>
            <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-md">CONNECTED</span>
          </div>
          <p className="text-xs text-slate-500 font-mono">ESP32-STATION-01 (192.168.1.42)</p>
        </div>

        {/* Ambang Batas Sensor (Threshold) */}
        <div className="space-y-4 pt-2">
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-sm font-medium text-slate-700">Rain Sensor Sensitivity</label>
              <span className="text-sm text-green-600 font-bold">75%</span>
            </div>
            <input type="range" className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-green-600" />
          </div>

          <div className="flex items-center justify-between p-3 border border-dashed border-slate-200 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <RefreshCw size={16} className="text-slate-400" />
              <span>Interval Update Data</span>
            </div>
            <select className="text-sm font-bold text-slate-700 bg-transparent outline-none">
              <option>3 Detik</option>
              <option>5 Detik</option>
              <option>10 Detik</option>
            </select>
          </div>
        </div>

        <button className="w-full mt-4 py-2 border border-red-100 text-red-500 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
          <RefreshCw size={14} /> Restart Perangkat
        </button>
      </div>
    </div>
  );
}