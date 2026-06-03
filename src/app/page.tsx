"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Sun,
  Moon,
  Cpu,
  CloudRain,
  Thermometer,
  Droplets,
  Smartphone,
  Bell,
  Database,
  Wifi,
  ShieldCheck,
  Server,
  ArrowRight,
  Layers,
  Users,
  BookOpen,
  Menu,
  X,
  Activity,
  History,
  AlertTriangle,
  Laptop
} from "lucide-react";
import { useThemeStore } from "@/stores/themeStore";

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const [isDark, setIsDark] = useState(false);

  // Simulator State
  const [isRainy, setIsRainy] = useState(false);
  const [isAutoMode, setIsAutoMode] = useState(true);
  const [clotheslineState, setClotheslineState] = useState<"TERBUKA" | "TERTUTUP">("TERBUKA");
  const [temp, setTemp] = useState(29.5);
  const [humidity, setHumidity] = useState(62);
  const [lightLevel, setLightLevel] = useState(85);
  const [simulatedLogs, setSimulatedLogs] = useState<string[]>([
    "[11:40:00] Sistem diinisialisasi. Mode: AUTOMATIC",
    "[11:40:05] Jemuran TERBUKA. Kondisi: Cerah"
  ]);

  // Sync theme
  useEffect(() => {
    setMounted(true);
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const resolvedDark =
      theme === "dark" ||
      (theme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    setIsDark(resolvedDark);
  }, [mounted, theme]);

  const addLog = useCallback((message: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setSimulatedLogs((prev) => [`[${time}] ${message}`, ...prev.slice(0, 4)]);
  }, []);

  // Event handlers for simulation
  const handleSimulateRainy = () => {
    setIsRainy(true);
    setTemp(23.8);
    setHumidity(88);
    setLightLevel(18);
    addLog("Sensor: Terdeteksi HUJAN!");
    if (isAutoMode) {
      setClotheslineState("TERTUTUP");
      addLog("Auto Mode: Menutup jemuran otomatis untuk melindungi pakaian.");
    } else {
      addLog("Sensor: Perintah tutup jemuran diabaikan (Mode MANUAL aktif).");
    }
  };

  const handleSimulateSunny = () => {
    setIsRainy(false);
    setTemp(30.2);
    setHumidity(55);
    setLightLevel(90);
    addLog("Sensor: Cuaca kembali cerah.");
    if (isAutoMode) {
      setClotheslineState("TERBUKA");
      addLog("Auto Mode: Membuka jemuran otomatis.");
    } else {
      addLog("Sensor: Perintah buka jemuran diabaikan (Mode MANUAL aktif).");
    }
  };

  const handleToggleMode = () => {
    const newAuto = !isAutoMode;
    setIsAutoMode(newAuto);
    addLog(`Mode diubah ke: ${newAuto ? "AUTOMATIC" : "MANUAL"}`);
    if (newAuto) {
      if (isRainy) {
        setClotheslineState("TERTUTUP");
        addLog("Auto Mode: Menyesuaikan status jemuran ke TERTUTUP (sedang hujan).");
      } else {
        setClotheslineState("TERBUKA");
        addLog("Auto Mode: Menyesuaikan status jemuran ke TERBUKA (cuaca cerah).");
      }
    }
  };

  const handleManualOpen = () => {
    if (isAutoMode) return;
    setClotheslineState("TERBUKA");
    addLog("Manual Override: Membuka jemuran.");
  };

  const handleManualClose = () => {
    if (isAutoMode) return;
    setClotheslineState("TERTUTUP");
    addLog("Manual Override: Menutup jemuran.");
  };

  const handleThemeToggle = () => {
    const newIsDark = !isDark;
    setTheme(newIsDark ? "dark" : "light");
    setIsDark(newIsDark);
  };

  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
          <p className="text-sm font-medium text-slate-500 animate-pulse">Memuat halaman...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-300 font-sans">
      
      {/* 1. HEADER / NAVBAR */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/60 dark:border-white/10 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-md">
                <Cpu className="h-5 w-5" />
              </div>
              <span className="font-bold text-lg bg-gradient-to-r from-teal-600 to-emerald-500 dark:from-teal-400 dark:to-emerald-400 bg-clip-text text-transparent">
                Smart Clothesline
              </span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-6 text-sm font-semibold text-slate-600 dark:text-slate-300">
              <a href="#masalah" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Masalah</a>
              <a href="#solusi" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Solusi</a>
              <a href="#fitur" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Fitur</a>
              <a href="#cara-kerja" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Cara Kerja</a>
              <a href="#big-data" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Big Data</a>
              <a href="#keamanan" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Keamanan</a>
            </nav>

            {/* Action Buttons */}
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={handleThemeToggle}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-slate-600 dark:text-slate-300"
                aria-label="Toggle dark mode"
                title={isDark ? "Light Mode" : "Dark Mode"}
              >
                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-500 text-white font-bold text-sm shadow-md hover:from-teal-500 hover:to-emerald-400 hover:shadow-teal-500/10 transition-all active:scale-95"
              >
                Buka Dashboard
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden items-center gap-2">
              <button
                onClick={handleThemeToggle}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-slate-600 dark:text-slate-300"
                aria-label="Toggle dark mode"
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                aria-label="Toggle Menu"
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 px-4 py-4 space-y-3 transition-all duration-300">
            <a
              href="#masalah"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 font-semibold text-sm"
            >
              Masalah
            </a>
            <a
              href="#solusi"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 font-semibold text-sm"
            >
              Solusi
            </a>
            <a
              href="#fitur"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 font-semibold text-sm"
            >
              Fitur
            </a>
            <a
              href="#cara-kerja"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 font-semibold text-sm"
            >
              Cara Kerja
            </a>
            <a
              href="#big-data"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 font-semibold text-sm"
            >
              Big Data
            </a>
            <a
              href="#keamanan"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 font-semibold text-sm"
            >
              Keamanan
            </a>
            <div className="pt-2 border-t border-slate-200 dark:border-white/5">
              <Link
                href="/dashboard"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-500 text-white font-bold text-sm shadow-md"
              >
                Buka Dashboard
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-32 bg-gradient-to-b from-teal-500/10 via-transparent to-transparent">
        {/* Background Gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 w-[500px] h-[500px] bg-gradient-to-br from-teal-300/20 to-sky-300/20 dark:from-teal-900/10 dark:to-sky-900/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-10 right-10 -z-10 w-[300px] h-[300px] bg-gradient-to-br from-emerald-300/20 to-teal-300/20 dark:from-emerald-900/10 dark:to-teal-900/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Copy */}
            <div className="lg:col-span-7 text-center lg:text-left space-y-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-xs font-bold text-teal-600 dark:text-teal-400 tracking-wider uppercase">
                <Cpu className="h-3.5 w-3.5" /> Smart Clothesline IoT System
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15] text-slate-800 dark:text-white">
                Cara lebih pintar melindungi jemuran dari{" "}
                <span className="bg-gradient-to-r from-teal-600 to-sky-500 dark:from-teal-400 dark:to-sky-400 bg-clip-text text-transparent">
                  hujan mendadak.
                </span>
              </h1>
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Pantau cuaca, kontrol jemuran Anda secara otomatis, serta terima notifikasi realtime dari satu dashboard cloud yang terintegrasi.
              </p>
              
              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-500 text-white font-extrabold shadow-lg hover:from-teal-500 hover:to-emerald-400 hover:shadow-teal-500/20 transition-all active:scale-95 text-base"
                >
                  Buka Dashboard
                </Link>
                <Link
                  href="/analytics"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-2xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors font-bold text-slate-700 dark:text-slate-300 text-base"
                >
                  Lihat Analisis
                </Link>
              </div>

              {/* Badges */}
              <div className="grid grid-cols-3 gap-4 pt-6 max-w-md mx-auto lg:mx-0 border-t border-slate-200/50 dark:border-white/5">
                <div>
                  <h4 className="text-xl font-bold text-teal-600 dark:text-teal-400">Realtime</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Telemetri Sensor</p>
                </div>
                <div>
                  <h4 className="text-xl font-bold text-emerald-600 dark:text-emerald-400">Otomatis</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Perlindungan Hujan</p>
                </div>
                <div>
                  <h4 className="text-xl font-bold text-sky-600 dark:text-sky-400">Telegram</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Notifikasi Instan</p>
                </div>
              </div>
            </div>

            {/* Right Telemetry Widget Mockup */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-6 shadow-2xl backdrop-blur-xl transition-all duration-300 relative">
                <div className="absolute top-3 right-3 flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Simulator Live</span>
                </div>

                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400">
                    <Laptop className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-white text-sm">Contoh Telemetri IoT</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Status aktual perangkat</p>
                  </div>
                </div>

                {/* Grid Readings */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-3.5 rounded-2xl bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/5 flex items-center gap-3">
                    <Thermometer className="h-5 w-5 text-amber-500" />
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-slate-400">Suhu</p>
                      <p className="text-base font-bold text-slate-800 dark:text-white">{temp.toFixed(1)}°C</p>
                    </div>
                  </div>
                  
                  <div className="p-3.5 rounded-2xl bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/5 flex items-center gap-3">
                    <Droplets className="h-5 w-5 text-sky-500" />
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-slate-400">Kelembapan</p>
                      <p className="text-base font-bold text-slate-800 dark:text-white">{humidity}%</p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/5 flex items-center gap-3">
                    {isRainy ? <CloudRain className="h-5 w-5 text-sky-500" /> : <Sun className="h-5 w-5 text-amber-500" />}
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-slate-400">Sensor Hujan</p>
                      <p className={`text-sm font-bold ${isRainy ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {isRainy ? "Terdeteksi Hujan" : "Kondisi Cerah"}
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/5 flex items-center gap-3">
                    <Cpu className="h-5 w-5 text-teal-500" />
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-slate-400">Jemuran</p>
                      <p className={`text-sm font-bold ${clotheslineState === 'TERBUKA' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-500'}`}>
                        {clotheslineState}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Control Panel Simulator */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-900/80 space-y-4">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Simulasikan Perubahan Cuaca:</p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSimulateRainy}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                        isRainy
                          ? "bg-rose-500 border-rose-600 text-white shadow-md shadow-rose-500/20"
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                      }`}
                    >
                      🌧️ Terjadi Hujan
                    </button>
                    <button
                      onClick={handleSimulateSunny}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                        !isRainy
                          ? "bg-emerald-500 border-emerald-600 text-white shadow-md shadow-emerald-500/20"
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                      }`}
                    >
                      ☀️ Cuaca Cerah
                    </button>
                  </div>
                  
                  <div className="border-t border-slate-200 dark:border-white/5 pt-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Mode: <span className="text-teal-600 dark:text-teal-400">{isAutoMode ? "Auto" : "Manual"}</span>
                    </span>
                    <button
                      onClick={handleToggleMode}
                      className="py-1 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] font-bold hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      Ganti ke {isAutoMode ? "Manual" : "Auto"}
                    </button>
                  </div>

                  {!isAutoMode && (
                    <div className="pt-2 border-t border-dashed border-slate-200 dark:border-white/5 flex gap-2">
                      <button
                        onClick={handleManualOpen}
                        disabled={clotheslineState === "TERBUKA"}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                          clotheslineState === "TERBUKA"
                            ? "bg-teal-600 border-teal-700 text-white opacity-60"
                            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                        }`}
                      >
                        Buka Jemuran
                      </button>
                      <button
                        onClick={handleManualClose}
                        disabled={clotheslineState === "TERTUTUP"}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                          clotheslineState === "TERTUTUP"
                            ? "bg-slate-600 border-slate-700 text-white opacity-60"
                            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                        }`}
                      >
                        Tutup Jemuran
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3. PROBLEM SECTION */}
      <section id="masalah" className="py-20 border-t border-slate-200/50 dark:border-white/5 bg-white dark:bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <span className="text-xs font-bold text-rose-500 uppercase tracking-widest">Tantangan Keseharian</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-white">
              Mengapa Jemuran Tradisional Menyulitkan Anda?
            </h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm sm:text-base">
              Menjemur pakaian terdengar sepele, namun cuaca yang tidak menentu seringkali mendatangkan masalah yang merugikan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {[
              {
                title: "Hujan Mendadak",
                desc: "Jemuran basah kuyup karena hujan deras tiba-tiba saat Anda sedang tidak di rumah.",
                color: "border-rose-500/20 bg-rose-500/5 text-rose-500"
              },
              {
                title: "Tidak Praktis",
                desc: "Mengontrol jemuran manual menyita tenaga dan waktu, terutama ketika Anda sibuk beraktivitas.",
                color: "border-amber-500/20 bg-amber-500/5 text-amber-500"
              },
              {
                title: "Buta Kondisi Rumah",
                desc: "Sulit memantau apakah cuaca di rumah sedang cerah atau mendung ketika Anda berada di luar.",
                color: "border-sky-500/20 bg-sky-500/5 text-sky-500"
              },
              {
                title: "Ketergantungan Sinar",
                desc: "Proses jemur pakaian sepenuhnya tergantung pada kejelasan sinar matahari tanpa alternatif pintar.",
                color: "border-yellow-500/20 bg-yellow-500/5 text-yellow-600 dark:text-yellow-400"
              },
              {
                title: "Alat Sulit Dipantau",
                desc: "Kondisi keausan atau operasional motor penggerak jemuran tidak dapat diketahui tanpa sistem monitor.",
                color: "border-slate-500/20 bg-slate-500/5 text-slate-500"
              }
            ].map((item, idx) => (
              <div
                key={idx}
                className={`p-6 rounded-2xl border ${item.color} flex flex-col justify-between hover:scale-[1.02] transition-transform`}
              >
                <div className="space-y-3">
                  <span className="text-lg font-bold">0{idx + 1}.</span>
                  <h3 className="font-bold text-slate-800 dark:text-white text-base">{item.title}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. SOLUTION SECTION */}
      <section id="solusi" className="py-20 border-t border-slate-200/50 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Diagram Panel */}
            <div className="lg:col-span-5 order-2 lg:order-1 flex justify-center">
              <div className="w-full max-w-sm p-6 rounded-3xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/50 shadow-xl relative space-y-6">
                <h4 className="font-bold text-slate-800 dark:text-white text-sm">Aliran Data Solusi IoT</h4>
                
                <div className="space-y-4 text-xs">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-teal-50 dark:bg-teal-500/5 border border-teal-200/50 dark:border-teal-500/10">
                    <div className="h-6 w-6 rounded bg-teal-500 text-white font-bold flex items-center justify-center">1</div>
                    <p className="text-slate-700 dark:text-slate-300">Sensor mendeteksi rintik air & tingkat cahaya.</p>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-sky-50 dark:bg-sky-500/5 border border-sky-200/50 dark:border-sky-500/10">
                    <div className="h-6 w-6 rounded bg-sky-500 text-white font-bold flex items-center justify-center">2</div>
                    <p className="text-slate-700 dark:text-slate-300">ESP32 memproses & mengirim sinyal via MQTT.</p>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200/50 dark:border-emerald-500/10">
                    <div className="h-6 w-6 rounded bg-emerald-500 text-white font-bold flex items-center justify-center">3</div>
                    <p className="text-slate-700 dark:text-slate-300">Dashboard cloud mengupdate UI & mengirim notifikasi Telegram.</p>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-500/5 border border-slate-200/50 dark:border-slate-500/10">
                    <div className="h-6 w-6 rounded bg-slate-500 text-white font-bold flex items-center justify-center">4</div>
                    <p className="text-slate-700 dark:text-slate-300">Data telemetri disimpan di Firestore untuk dianalisis.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Copy */}
            <div className="lg:col-span-7 order-1 lg:order-2 space-y-6">
              <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest">Solusi Terintegrasi</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-white">
                Bagaimana Sistem IoT Menyelamatkan Cucian Anda?
              </h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm sm:text-base">
                Smart Clothesline menghubungkan sensor cuaca fisik (suhu, kelembapan, cahaya, hujan) dengan motor penggerak otomatis melalui cloud.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-teal-500 font-bold">✓</span>
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">Sensor Akurat</h4>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Membaca curah hujan dan tingkat cahaya matahari secara instan untuk memperkirakan kondisi penjemuran terbaik.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-teal-500 font-bold">✓</span>
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">Dashboard Responsif</h4>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Kontrol manual jarak jauh jika Anda ingin menyesuaikan jemuran di luar keputusan otomatis sistem.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-teal-500 font-bold">✓</span>
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">Sistem Proteksi Telegram</h4>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Menerima notifikasi langsung ke Telegram saat jemuran menutup otomatis akibat air hujan terdeteksi.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-teal-500 font-bold">✓</span>
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">Simulasi Wokwi</h4>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Mendukung simulator Wokwi untuk mempermudah simulasi sirkuit dan pengujian kode bagi pembelajar IoT.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 5. FEATURES SECTION */}
      <section id="fitur" className="py-20 border-t border-slate-200/50 dark:border-white/5 bg-slate-100/40 dark:bg-slate-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest">Fitur Unggulan</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-white">
              Semua Fitur dalam Genggaman Anda
            </h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm sm:text-base">
              Menghadirkan fitur-fitur esensial untuk mempermudah monitoring jemuran Anda, mulai dari hardware hingga pipeline analisis data besar.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: <Activity className="h-6 w-6 text-teal-500" />,
                title: "Pemantauan Real-time",
                desc: "Pantau suhu, kelembapan, cahaya, dan status hujan secara instan kapan saja."
              },
              {
                icon: <CloudRain className="h-6 w-6 text-sky-500" />,
                title: "Deteksi Hujan Otomatis",
                desc: "Sensor mendeteksi rintik hujan dan menutup jemuran secara otomatis untuk melindungi pakaian Anda."
              },
              {
                icon: <Smartphone className="h-6 w-6 text-indigo-500" />,
                title: "Kontrol Dashboard",
                desc: "Buka dan tutup jemuran atau ganti mode operasi dari mana saja dengan sekali klik."
              },
              {
                icon: <Bell className="h-6 w-6 text-amber-500" />,
                title: "Notifikasi Telegram",
                desc: "Dapatkan pemberitahuan langsung di ponsel Anda saat status jemuran berubah atau hujan turun."
              },
              {
                icon: <Wifi className="h-6 w-6 text-emerald-500" />,
                title: "Manajemen Perangkat",
                desc: "Kelola konektivitas perangkat ESP32 dan pantau status online/offline dengan mudah."
              },
              {
                icon: <History className="h-6 w-6 text-sky-600" />,
                title: "Analisis Riwayat",
                desc: "Tinjau grafik data sensor harian dan mingguan untuk memahami pola cuaca di sekitar Anda."
              },
              {
                icon: <Database className="h-6 w-6 text-purple-500" />,
                title: "Analisis Batch Hadoop",
                desc: "Dukungan analisis data skala besar untuk laporan historis jangka panjang yang mendalam."
              },
              {
                icon: <Cpu className="h-6 w-6 text-slate-500" />,
                title: "Integrasi ESP32 & Wokwi",
                desc: "Sistem dapat berjalan pada hardware ESP32 fisik maupun simulator Wokwi untuk kemudahan pengujian."
              }
            ].map((feat, idx) => (
              <div
                key={idx}
                className="p-6 rounded-3xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/50 hover:shadow-xl transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1"
              >
                <div className="space-y-4">
                  <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center transition-transform group-hover:scale-110">
                    {feat.icon}
                  </div>
                  <h3 className="font-extrabold text-slate-800 dark:text-white text-base leading-snug">{feat.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. HOW IT WORKS SECTION */}
      <section id="cara-kerja" className="py-20 border-t border-slate-200/50 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest">Cara Kerja</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-white">
              Langkah Sederhana Cara Kerja Sistem
            </h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm sm:text-base">
              Dari deteksi cuaca lokal hingga analisis data historis di server cloud, berikut alur kerja otomatisnya.
            </p>
          </div>

          {/* 4 Steps Flow */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-16 relative">
            {[
              {
                step: "1",
                title: "Membaca Lingkungan",
                desc: "Sensor fisik atau simulasi membaca parameter suhu, kelembapan, cahaya, dan curah hujan."
              },
              {
                step: "2",
                title: "Kirim Data via MQTT",
                desc: "Perangkat ESP32 mengirimkan data telemetri secara instan ke broker MQTT cloud."
              },
              {
                step: "3",
                title: "Visualisasi & Notifikasi",
                desc: "Dashboard memproses data secara real-time dan Telegram mengirim notifikasi jika darurat."
              },
              {
                step: "4",
                title: "Simpan & Analisis",
                desc: "Data tersimpan di Firestore dan diekspor ke Hadoop untuk analisis batch jangka panjang."
              }
            ].map((step, idx) => (
              <div key={idx} className="relative p-6 rounded-2xl bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-white/5 text-center space-y-3">
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 h-10 w-10 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 text-white font-extrabold text-sm flex items-center justify-center shadow-md">
                  {step.step}
                </div>
                <h3 className="font-bold text-slate-800 dark:text-white text-base pt-3">{step.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>

          {/* Architecture Strip */}
          <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-880 bg-slate-100/50 dark:bg-slate-900/60 flex flex-col items-center justify-center gap-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Alur Pipa Data Sistem IoT</p>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs font-bold text-slate-700 dark:text-slate-300">
              <span className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700">ESP32 / Wokwi</span>
              <span className="text-teal-500">➔</span>
              <span className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700">MQTT Broker</span>
              <span className="text-teal-500">➔</span>
              <span className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700">Web Dashboard</span>
              <span className="text-teal-500">➔</span>
              <span className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700">Cloud Firestore</span>
              <span className="text-teal-500">➔</span>
              <span className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700">Analytics & Hadoop</span>
            </div>
          </div>
        </div>
      </section>

      {/* 7. DASHBOARD PREVIEW SECTION */}
      <section className="py-20 border-t border-slate-200/50 dark:border-white/5 bg-slate-100/40 dark:bg-slate-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest">Pratinjau Dashboard</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-white">
              Antarmuka Kontrol yang Bersih dan Intuitif
            </h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm sm:text-base">
              Melihat pratinjau bagaimana Anda mengelola status perangkat dan memantau kondisi cuaca langsung secara grafis.
            </p>
          </div>

          {/* Desktop Dashboard Mockup */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-880 bg-white dark:bg-slate-900 overflow-hidden shadow-2xl">
            {/* Mock Window Bar */}
            <div className="bg-slate-100 dark:bg-slate-950 px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-rose-500" />
                <span className="h-3 w-3 rounded-full bg-amber-500" />
                <span className="h-3 w-3 rounded-full bg-emerald-500" />
              </div>
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">smart-clothesline-workspace</span>
              <div className="w-10" />
            </div>

            {/* Mock Dashboard Content */}
            <div className="p-6 md:p-8 space-y-6">
              
              {/* Header Status Bar */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-200/60 dark:border-white/5">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">Workspace Pengendalian Jemuran</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">ID Perangkat: <span className="font-mono text-teal-600 dark:text-teal-400">esp32_clothesline_01</span></p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Alat Terhubung
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-teal-500/10 border border-teal-500/20 text-xs font-bold text-teal-600 dark:text-teal-400">
                    Mode: {isAutoMode ? "AUTO" : "MANUAL"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-500/10 border border-sky-500/20 text-xs font-bold text-sky-600 dark:text-sky-400">
                    Jemuran: {clotheslineState}
                  </span>
                </div>
              </div>

              {/* Layout Sensor Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: "Suhu Udara", value: `${temp.toFixed(1)} °C`, status: temp > 28 ? "Hangat" : "Sejuk", color: "text-amber-500", icon: <Thermometer className="h-5 w-5" /> },
                  { label: "Kelembapan", value: `${humidity} %`, status: humidity > 70 ? "Tinggi" : "Normal", color: "text-sky-500", icon: <Droplets className="h-5 w-5" /> },
                  { label: "Sensor Hujan", value: isRainy ? "Hujan" : "Cerah", status: isRainy ? "Terdeteksi" : "Aman", color: "text-emerald-500", icon: <CloudRain className="h-5 w-5" /> },
                  { label: "Intensitas Cahaya", value: `${lightLevel * 10} Lux`, status: lightLevel > 55 ? "Terang" : "Redup", color: "text-yellow-500", icon: <Sun className="h-5 w-5" /> }
                ].map((sensor, idx) => (
                  <div key={idx} className="p-5 rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/40 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{sensor.label}</span>
                      <div className={`p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-white/5 ${sensor.color}`}>
                        {sensor.icon}
                      </div>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-2xl font-bold text-slate-800 dark:text-white">{sensor.value}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 uppercase">{sensor.status}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Simulated Device Control Box */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
                <div className="lg:col-span-2 p-5 rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between">
                  <div className="space-y-2 mb-4">
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">Log Aktivitas Terbaru</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Catatan telemetri real-time dari broker MQTT</p>
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl font-mono text-[10px] text-slate-600 dark:text-slate-400 space-y-2 max-h-[120px] overflow-y-auto">
                    {simulatedLogs.map((log, index) => (
                      <p key={index} className={index === 0 ? "text-teal-600 dark:text-teal-400" : "text-slate-500"}>
                        {log}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/40 space-y-4">
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">Aktuator Fisik</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Kontrol manual override motor jemuran</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <button className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed">
                        Buka (Disable)
                      </button>
                      <button className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed">
                        Tutup (Disable)
                      </button>
                    </div>
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-2.5 items-start">
                      <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-[10px] text-amber-700 dark:text-amber-300 leading-relaxed font-semibold">
                        Ganti mode ke MANUAL pada dasbor Anda untuk mengaktifkan tombol kendali jemuran jarak jauh secara langsung.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* 8. USE CASES SECTION */}
      <section className="py-20 border-t border-slate-200/50 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest">Skenario Penerapan</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-white">
              Sangat Cocok untuk Berbagai Kebutuhan
            </h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm sm:text-base">
              Smart Clothesline dirancang fleksibel untuk memecahkan masalah penjemuran pakaian di berbagai kondisi lingkungan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {[
              {
                icon: <Sun className="h-6 w-6 text-teal-500" />,
                title: "Rumah Tangga",
                desc: "Melindungi cucian keluarga saat rumah kosong ditinggal bekerja seharian tanpa khawatir mendung tiba-tiba."
              },
              {
                icon: <Users className="h-6 w-6 text-indigo-500" />,
                title: "Rumah Kos (Kost)",
                desc: "Membantu banyak penghuni kost mengeringkan baju bersama di atap tanpa harus saling menunggu."
              },
              {
                icon: <Smartphone className="h-6 w-6 text-emerald-500" />,
                title: "Bisnis Laundry",
                desc: "Meningkatkan efisiensi kerja operator laundry dengan sistem jemuran yang responsif terhadap cuaca."
              },
              {
                icon: <BookOpen className="h-6 w-6 text-amber-500" />,
                title: "Laboratorium IoT",
                desc: "Sarana pembelajaran mahasiswa dan pelajar untuk mempelajari mikrokontroler & arsitektur jaringan IoT."
              },
              {
                icon: <Layers className="h-6 w-6 text-purple-500" />,
                title: "Pembelajaran Cloud",
                desc: "Studi kasus komprehensif bagi developer untuk mempelajari integrasi broker MQTT, Firestore, dan Hadoop."
              }
            ].map((uc, idx) => (
              <div
                key={idx}
                className="p-6 rounded-3xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/40 flex flex-col justify-between hover:scale-[1.02] transition-transform"
              >
                <div className="space-y-4">
                  <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-600 dark:text-slate-300">
                    {uc.icon}
                  </div>
                  <h3 className="font-extrabold text-slate-800 dark:text-white text-base leading-snug">{uc.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{uc.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. CLOUD AND BIG DATA SECTION */}
      <section id="big-data" className="py-20 border-t border-slate-200/50 dark:border-white/5 bg-slate-100/40 dark:bg-slate-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Copy */}
            <div className="lg:col-span-7 space-y-6">
              <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest">Infrastruktur Data</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-white">
                Dirancang untuk Pembelajaran Cloud & Big Data
              </h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm sm:text-base">
                Proyek ini mengintegrasikan pengolahan data real-time dengan pemrosesan analitik batch skala besar untuk kebutuhan pelaporan jangka panjang yang mendalam.
              </p>

              {/* Data Layers Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/50 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-teal-500" />
                    <h4 className="font-bold text-slate-800 dark:text-white text-xs">Pesan Realtime (MQTT)</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Broker MQTT menangani pengiriman data telemetri instan dari mikrokontroler dengan latensi milidetik.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/50 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <h4 className="font-bold text-slate-800 dark:text-white text-xs">Penyimpanan Riwayat (Firestore)</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Database Cloud Firestore mencatat log aktivitas jemuran untuk pemuatan grafik dasbor instan.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/50 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-sky-500" />
                    <h4 className="font-bold text-slate-800 dark:text-white text-xs">Notifikasi Instan (Telegram)</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Pemberitahuan khusus dikirim ke bot Telegram sebagai media alert praktis untuk kenyamanan pengguna.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/50 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-purple-500" />
                    <h4 className="font-bold text-slate-800 dark:text-white text-xs">Analisis Batch (Hadoop)</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Hadoop MapReduce memproses data telemetri yang diekspor untuk membuat laporan kecenderungan cuaca bulanan.
                  </p>
                </div>
              </div>

              {/* Warning Alert Hadoop vs Control */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex gap-3 items-start">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-amber-800 dark:text-amber-300 text-xs">Penting Diketahui</h5>
                  <p className="text-[10px] text-amber-700 dark:text-amber-300 leading-relaxed font-semibold mt-1">
                    Framework Hadoop digunakan khusus untuk laporan batch jangka panjang (analitik historis), bukan untuk kontrol motor jemuran secara real-time.
                  </p>
                </div>
              </div>

              {/* CTA link to big data page */}
              <div className="pt-2">
                <Link
                  href="/big-data"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold text-xs hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-md"
                >
                  Lihat Analisis Big Data <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* Right Big Data Visual Panel */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-sm p-6 rounded-3xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/50 shadow-xl space-y-4">
                <div className="flex items-center gap-2">
                  <Server className="h-5 w-5 text-teal-600" />
                  <span className="font-bold text-xs text-slate-800 dark:text-white">Arsitektur Pipeline Pembelajaran</span>
                </div>
                
                {/* Visual nodes */}
                <div className="space-y-3 pt-2">
                  <div className="p-3 rounded-xl bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Input Telemetri</span>
                    <span className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400">ESP32 (MQTT)</span>
                  </div>
                  <div className="flex justify-center text-slate-400 text-xs">↓</div>
                  
                  <div className="p-3 rounded-xl bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Penyimpanan Cloud</span>
                    <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">Firestore NoSQL</span>
                  </div>
                  <div className="flex justify-center text-slate-400 text-xs">↓</div>
                  
                  <div className="p-3 rounded-xl bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Batch ETL Export</span>
                    <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">JSON/CSV Export</span>
                  </div>
                  <div className="flex justify-center text-slate-400 text-xs">↓</div>
                  
                  <div className="p-3 rounded-xl bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Pemrosesan Batch</span>
                    <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">Hadoop MapReduce</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 10. SAFETY AND TRUST SECTION */}
      <section id="keamanan" className="py-20 border-t border-slate-200/50 dark:border-white/5 bg-white dark:bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest">Keandalan Sistem</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-white">
              Keamanan dan Kepercayaan dalam Desain Kami
            </h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm sm:text-base">
              Kami memprioritaskan keamanan operasional alat demi kenyamanan dan perlindungan data Anda.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <ShieldCheck className="h-6 w-6 text-teal-600" />,
                title: "Fallback Lokal Otomatis",
                desc: "Perangkat ESP32 memiliki algoritma lokal untuk menutup jemuran secara mandiri jika terdeteksi hujan ketika koneksi internet ke cloud terputus."
              },
              {
                icon: <Bell className="h-6 w-6 text-emerald-600" />,
                title: "Telegram Notification Only",
                desc: "Saluran Telegram digunakan khusus sebagai pembawa notifikasi instan, mencegah celah injeksi perintah langsung dari luar sistem utama."
              },
              {
                icon: <Cpu className="h-6 w-6 text-indigo-600" />,
                title: "Isolasi Topik MQTT",
                desc: "Setiap alat menggunakan pengalamatan topik MQTT unik per-perangkat untuk mencegah data antar pengguna saling tertukar."
              }
            ].map((safety, idx) => (
              <div key={idx} className="p-6 rounded-3xl border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/50 space-y-4 hover:scale-[1.02] transition-transform">
                <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                  {safety.icon}
                </div>
                <h3 className="font-extrabold text-slate-800 dark:text-white text-base leading-snug">{safety.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{safety.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 11. FINAL CTA SECTION */}
      <section className="relative py-24 bg-gradient-to-br from-teal-600 to-emerald-700 text-white overflow-hidden text-center">
        {/* Background blobs */}
        <div className="absolute top-10 left-10 -z-10 w-[300px] h-[300px] bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 -z-10 w-[300px] h-[300px] bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            Siap Memantau Jemuran Pintar Anda?
          </h2>
          <p className="text-base sm:text-lg text-teal-100 max-w-xl mx-auto leading-relaxed">
            Buka dashboard sekarang, hubungkan sirkuit mikrokontroler Anda, dan nikmati kemudahan penjemuran otomatis hari ini.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-2xl bg-white text-teal-700 font-extrabold shadow-xl hover:bg-slate-50 transition-colors text-base"
            >
              Buka Dashboard
            </Link>
            <Link
              href="/analytics"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-2xl border border-white/20 bg-white/5 text-white font-bold hover:bg-white/10 transition-colors text-base"
            >
              Lihat Analisis
            </Link>
          </div>
        </div>
      </section>

      {/* 12. FOOTER */}
      <footer className="bg-slate-100 dark:bg-slate-950 border-t border-slate-200/50 dark:border-white/5 py-12 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500 text-white font-bold">
              <Cpu className="h-4.5 w-4.5" />
            </div>
            <span className="font-bold text-sm text-slate-700 dark:text-slate-300">
              Smart Clothesline IoT System
            </span>
          </div>

          <p className="text-xs text-slate-400 dark:text-slate-500">
            &copy; {new Date().getFullYear()} Smart Clothesline IoT System. Cloud Computing & Big Data Learning Project.
          </p>
        </div>
      </footer>

    </div>
  );
}
