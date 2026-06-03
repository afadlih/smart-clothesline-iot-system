"use client";

import { useState } from "react";
import { Sun, CloudRain, Thermometer, Droplets, Wifi } from "lucide-react";

export default function InteractiveSimulator() {
  const [isRainy, setIsRainy] = useState(false);
  const [clotheslineState, setClotheslineState] = useState<"OPEN" | "CLOSED">("OPEN");
  const [temp, setTemp] = useState(30.2);
  const [humidity, setHumidity] = useState(54);

  const handleSimulateRainy = () => {
    setIsRainy(true);
    setTemp(22.8);
    setHumidity(88);
    setClotheslineState("CLOSED");
  };

  const handleSimulateSunny = () => {
    setIsRainy(false);
    setTemp(30.2);
    setHumidity(54);
    setClotheslineState("OPEN");
  };

  return (
    <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-6 shadow-xl backdrop-blur transition-all duration-300 relative">
      <div className="absolute top-4 right-4 flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Interactive Preview</span>
      </div>

      <div className="mb-6">
        <div className="font-extrabold text-slate-800 dark:text-white text-base">Your Smart Clothesline</div>
        <p className="text-xs text-slate-600 dark:text-slate-400">Try simulating weather changes below</p>
      </div>

      {/* Status Indicator */}
      <div className="mb-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-white/5 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-600 dark:text-slate-450">Clothesline Cover:</span>
        <span className={`px-4 py-1.5 rounded-full text-xs font-black transition-all ${
          clotheslineState === "OPEN"
            ? "bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400 border border-teal-500/20"
            : "bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-500/20"
        }`}>
          {clotheslineState === "OPEN" ? "☀️ OPEN (Drying)" : "🌧️ CLOSED (Protected)"}
        </span>
      </div>

      {/* Grid Readings */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/40 dark:border-white/5 flex items-center gap-3">
          <Thermometer className="h-5 w-5 text-amber-500" aria-hidden="true" />
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">Temperature</p>
            <p className="text-sm font-extrabold text-slate-800 dark:text-white">{temp.toFixed(1)}°C</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/40 dark:border-white/5 flex items-center gap-3">
          <Droplets className="h-5 w-5 text-sky-500" aria-hidden="true" />
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">Humidity</p>
            <p className="text-sm font-extrabold text-slate-800 dark:text-white">{humidity}%</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/40 dark:border-white/5 flex items-center gap-3">
          {isRainy ? (
            <CloudRain className="h-5 w-5 text-sky-500" aria-hidden="true" />
          ) : (
            <Sun className="h-5 w-5 text-amber-500" aria-hidden="true" />
          )}
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">Weather</p>
            <p className={`text-xs font-black ${isRainy ? 'text-rose-500' : 'text-emerald-500'}`}>
              {isRainy ? "Raining" : "Clear & Sunny"}
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/40 dark:border-white/5 flex items-center gap-3">
          <Wifi className="h-5 w-5 text-emerald-500" aria-hidden="true" />
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">Status</p>
            <p className="text-xs font-bold text-emerald-500">Connected</p>
          </div>
        </div>
      </div>

      {/* Simulation Button */}
      <button
        onClick={isRainy ? handleSimulateSunny : handleSimulateRainy}
        className={`w-full py-3.5 px-4 rounded-2xl text-xs font-bold border transition-all active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-teal-500 ${
          isRainy
            ? "bg-gradient-to-r from-emerald-600 to-teal-500 border-emerald-600 text-white shadow-md shadow-emerald-500/20"
            : "bg-gradient-to-r from-rose-600 to-orange-500 border-rose-600 text-white shadow-md shadow-rose-500/20"
        }`}
      >
        {isRainy ? "☀️ Clear Weather & Dry Clothes" : "🌧️ Simulate Sudden Rain"}
      </button>
    </div>
  );
}
