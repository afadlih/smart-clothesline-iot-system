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
  Wifi,
  ShieldCheck,
  Layers,
  Users,
  BookOpen,
  Menu,
  X,
  Activity,
  History,
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
  const [clotheslineState, setClotheslineState] = useState<"OPEN" | "CLOSED">("OPEN");
  const [temp, setTemp] = useState(29.5);
  const [humidity, setHumidity] = useState(62);
  const [lightLevel, setLightLevel] = useState(85);
  const [simulatedLogs, setSimulatedLogs] = useState<string[]>([]);

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

  // Initialize logs on mount
  useEffect(() => {
    if (mounted && simulatedLogs.length === 0) {
      addLog("System initialized. Mode: AUTOMATIC");
      addLog("Clothesline OPEN. Weather: Sunny");
    }
  }, [mounted, simulatedLogs.length, addLog]);

  // Event handlers for simulation
  const handleSimulateRainy = () => {
    setIsRainy(true);
    setTemp(22.4);
    setHumidity(90);
    setLightLevel(15);
    addLog("Sensor: RAIN DETECTED!");
    if (isAutoMode) {
      setClotheslineState("CLOSED");
      addLog("Auto Mode: Automatically closing clothesline to protect laundry.");
    } else {
      addLog("Sensor: Rain detected (Ignored: MANUAL mode active).");
    }
  };

  const handleSimulateSunny = () => {
    setIsRainy(false);
    setTemp(30.5);
    setHumidity(52);
    setLightLevel(88);
    addLog("Sensor: Weather cleared.");
    if (isAutoMode) {
      setClotheslineState("OPEN");
      addLog("Auto Mode: Automatically opening clothesline to resume drying.");
    } else {
      addLog("Sensor: Weather cleared (Ignored: MANUAL mode active).");
    }
  };

  const handleToggleMode = () => {
    const newAuto = !isAutoMode;
    setIsAutoMode(newAuto);
    addLog(`Mode toggled to: ${newAuto ? "AUTOMATIC" : "MANUAL"}`);
    if (newAuto) {
      if (isRainy) {
        setClotheslineState("CLOSED");
        addLog("Auto Mode: Synced clothesline to CLOSED state (raining).");
      } else {
        setClotheslineState("OPEN");
        addLog("Auto Mode: Synced clothesline to OPEN state (clear weather).");
      }
    }
  };

  const handleManualOpen = () => {
    if (isAutoMode) return;
    setClotheslineState("OPEN");
    addLog("Manual Override: Opening clothesline.");
  };

  const handleManualClose = () => {
    if (isAutoMode) return;
    setClotheslineState("CLOSED");
    addLog("Manual Override: Closing clothesline.");
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
          <p className="text-sm font-medium text-slate-500 animate-pulse">Loading landing page...</p>
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
              <a href="#features" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">How It Works</a>
              <a href="#technology" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Technology</a>
              <Link href="/iot-hub" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">IoT Hub</Link>
              <Link href="/dashboard" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Dashboard</Link>
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
                Open Dashboard
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
              href="#features"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 font-semibold text-sm"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 font-semibold text-sm"
            >
              How It Works
            </a>
            <a
              href="#technology"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 font-semibold text-sm"
            >
              Technology
            </a>
            <Link
              href="/iot-hub"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 font-semibold text-sm"
            >
              IoT Hub
            </Link>
            <Link
              href="/dashboard"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 font-semibold text-sm"
            >
              Dashboard
            </Link>
            <div className="pt-2 border-t border-slate-200 dark:border-white/5">
              <Link
                href="/dashboard"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-500 text-white font-bold text-sm shadow-md"
              >
                Open Dashboard
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-32 bg-gradient-to-b from-teal-500/10 via-transparent to-transparent">
        {/* Background Gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 w-[500px] h-[500px] bg-gradient-to-br from-teal-300/20 to-sky-300/20 dark:from-teal-900/10 dark:to-sky-900/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-10 right-10 -z-10 w-[300px] h-[300px] bg-gradient-to-br from-emerald-300/20 to-teal-300/20 dark:from-emerald-900/10 dark:to-teal-900/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">

            {/* Left Copy */}
            <div className="lg:col-span-7 text-center lg:text-left space-y-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-xs font-bold text-teal-600 dark:text-teal-400 tracking-wider uppercase">
                <Cpu className="h-3.5 w-3.5" /> Smart Clothesline
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15] text-slate-800 dark:text-white">
                Keep your clothes safer when the{" "}
                <span className="bg-gradient-to-r from-teal-600 to-sky-500 dark:from-teal-400 dark:to-sky-400 bg-clip-text text-transparent">
                  weather changes.
                </span>
              </h1>
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Smart Clothesline monitors rain, light, temperature, and humidity, then helps you open or close the clothesline through a realtime dashboard.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-500 text-white font-extrabold shadow-lg hover:from-teal-500 hover:to-emerald-400 hover:shadow-teal-500/20 transition-all active:scale-95 text-base"
                >
                  Open Dashboard
                </Link>
                <Link
                  href="/iot-hub"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-2xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors font-bold text-slate-700 dark:text-slate-300 text-base"
                >
                  Configure Device
                </Link>
              </div>

              {/* Status Chips */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-2 pt-4 border-t border-slate-200/50 dark:border-white/5">
                {["Realtime MQTT", "Rain Detection", "Telegram Alerts", "Device Pairing"].map((chip) => (
                  <span key={chip} className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            {/* Right Telemetry Widget Mockup */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-6 shadow-2xl backdrop-blur-xl transition-all duration-300 relative">
                <div className="absolute top-3 right-3 flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Simulator</span>
                </div>

                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400">
                    <Laptop className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-white text-sm">IoT Telemetry Widget</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Live mockup of actual device telemetry</p>
                  </div>
                </div>

                {/* Grid Readings */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-3.5 rounded-2xl bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/5 flex items-center gap-3">
                    <Thermometer className="h-5 w-5 text-amber-500" />
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-slate-400">Temperature</p>
                      <p className="text-base font-bold text-slate-800 dark:text-white">{temp.toFixed(1)}°C</p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/5 flex items-center gap-3">
                    <Droplets className="h-5 w-5 text-sky-500" />
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-slate-400">Humidity</p>
                      <p className="text-base font-bold text-slate-800 dark:text-white">{humidity}%</p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/5 flex items-center gap-3">
                    {isRainy ? <CloudRain className="h-5 w-5 text-sky-500" /> : <Sun className="h-5 w-5 text-amber-500" />}
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-slate-400">Rain Sensor</p>
                      <p className={`text-sm font-bold ${isRainy ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {isRainy ? "Raining" : "Sunny"}
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/5 flex items-center gap-3">
                    <Cpu className="h-5 w-5 text-teal-500" />
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-slate-400">Clothesline</p>
                      <p className={`text-sm font-bold ${clotheslineState === 'OPEN' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-500'}`}>
                        {clotheslineState}
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/5 flex items-center gap-3">
                    <Sun className="h-5 w-5 text-yellow-500" />
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-slate-400">Light Level</p>
                      <p className="text-base font-bold text-slate-800 dark:text-white">{lightLevel * 10} Lux</p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/5 flex items-center gap-3">
                    <Wifi className="h-5 w-5 text-emerald-500" />
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-slate-400">Connectivity</p>
                      <p className="text-base font-bold text-emerald-500">ONLINE</p>
                    </div>
                  </div>
                </div>

                {/* Control Panel Simulator */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-900/80 space-y-4">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Simulate Local Weather:</p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSimulateRainy}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all ${isRainy
                        ? "bg-rose-500 border-rose-600 text-white shadow-md shadow-rose-500/20"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                        }`}
                    >
                      🌧️ Make It Rain
                    </button>
                    <button
                      onClick={handleSimulateSunny}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all ${!isRainy
                        ? "bg-emerald-500 border-emerald-600 text-white shadow-md shadow-emerald-500/20"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                        }`}
                    >
                      ☀️ Make It Sunny
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
                      Switch to {isAutoMode ? "Manual" : "Auto"}
                    </button>
                  </div>

                  {!isAutoMode && (
                    <div className="pt-2 border-t border-dashed border-slate-200 dark:border-white/5 flex gap-2">
                      <button
                        onClick={handleManualOpen}
                        disabled={clotheslineState === "OPEN"}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${clotheslineState === "OPEN"
                          ? "bg-teal-600 border-teal-700 text-white opacity-60"
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                          }`}
                      >
                        Open Clothesline
                      </button>
                      <button
                        onClick={handleManualClose}
                        disabled={clotheslineState === "CLOSED"}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${clotheslineState === "CLOSED"
                          ? "bg-slate-600 border-slate-700 text-white opacity-60"
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                          }`}
                      >
                        Close Clothesline
                      </button>
                    </div>
                  )}
                </div>

                {/* Live Activity Log console */}
                <div className="mt-4 p-3.5 rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-100/50 dark:bg-slate-900/60 space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Activity Log</p>
                  <div className="bg-slate-100 dark:bg-slate-950 p-3 rounded-xl font-mono text-[9px] text-slate-600 dark:text-slate-400 space-y-1.5 max-h-[75px] overflow-y-auto">
                    {simulatedLogs.map((log, index) => (
                      <p key={index} className={index === 0 ? "text-teal-600 dark:text-teal-400" : "text-slate-500"}>
                        {log}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. PROBLEM SECTION */}
      <section id="problems" className="py-20 border-t border-slate-200/50 dark:border-white/5 bg-white dark:bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <span className="text-xs font-bold text-rose-500 uppercase tracking-widest">Why This Exists</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-white">
              The Challenges of Traditional Drying
            </h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm sm:text-base">
              Drying clothes outside remains a daily chore filled with uncertainty and micro-management.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "Unexpected Rain",
                desc: "Sudden weather changes soak clean clothes when users are away from home, ruining the wash.",
                color: "border-rose-500/20 bg-rose-500/5 text-rose-500"
              },
              {
                title: "Manual Checking",
                desc: "Constantly looking outside at the sky is distracting and wastes valuable time throughout the day.",
                color: "border-amber-500/20 bg-amber-500/5 text-amber-500"
              },
              {
                title: "No Remote Control",
                desc: "Traditional clotheslines cannot be controlled from a distance when sudden cloudiness strikes.",
                color: "border-sky-500/20 bg-sky-500/5 text-sky-500"
              },
              {
                title: "No Drying History",
                desc: "Drying patterns are unrecorded, making it difficult to analyze ambient drying efficiency.",
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

      {/* 3. SOLUTION SECTION */}
      <section id="solusi" className="py-20 border-t border-slate-200/50 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

            {/* Left Diagram Panel */}
            <div className="lg:col-span-5 order-2 lg:order-1 flex justify-center">
              <div className="w-full max-w-sm p-6 rounded-3xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/50 shadow-xl relative space-y-6">
                <h4 className="font-bold text-slate-800 dark:text-white text-sm">System Pipeline Flow</h4>

                <div className="space-y-4 text-xs">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-teal-50 dark:bg-teal-500/5 border border-teal-200/50 dark:border-teal-500/10">
                    <div className="h-6 w-6 rounded bg-teal-500 text-white font-bold flex items-center justify-center">1</div>
                    <p className="text-slate-700 dark:text-slate-300">Sensor reads weather (light, rain, temp, hum).</p>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-sky-50 dark:bg-sky-500/5 border border-sky-200/50 dark:border-sky-500/10">
                    <div className="h-6 w-6 rounded bg-sky-500 text-white font-bold flex items-center justify-center">2</div>
                    <p className="text-slate-700 dark:text-slate-300">Device sends telemetry over MQTT broker.</p>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200/50 dark:border-emerald-500/10">
                    <div className="h-6 w-6 rounded bg-emerald-500 text-white font-bold flex items-center justify-center">3</div>
                    <p className="text-slate-700 dark:text-slate-300">Dashboard updates realtime & Telegram sends alerts.</p>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-500/5 border border-slate-200/50 dark:border-slate-500/10">
                    <div className="h-6 w-6 rounded bg-slate-500 text-white font-bold flex items-center justify-center">4</div>
                    <p className="text-slate-700 dark:text-slate-300">Analytics dashboard displays historical drying logs.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Copy */}
            <div className="lg:col-span-7 order-1 lg:order-2 space-y-6">
              <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest">Our Solution</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-white">
                How Smart Clothesline Solves It
              </h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm sm:text-base">
                Smart Clothesline combines sensors, device automation, cloud dashboard, and notification to help users monitor and control a clothesline more reliably.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-teal-500 font-bold">✓</span>
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">Automated Safety</h4>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    The clothesline closes immediately when rain drops are detected, saving your laundry without human intervention.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-teal-500 font-bold">✓</span>
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">Realtime Awareness</h4>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Read active sensor data such as solar intensity and temperature directly from your phone or computer.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-teal-500 font-bold">✓</span>
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">Instant Notifications</h4>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Get notification-only updates directly inside Telegram as soon as clothesline actions are executed.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-teal-500 font-bold">✓</span>
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">Interactive Sandbox</h4>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Try the simulation instantly in the Wokwi emulator without purchasing any complex physical components first.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 4. CORE FEATURES SECTION */}
      <section id="features" className="py-20 border-t border-slate-200/50 dark:border-white/5 bg-slate-100/40 dark:bg-slate-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest">Key Features</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-white">
              Designed for Convenience and Control
            </h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm sm:text-base">
              A comprehensive list of core system features that support your day-to-day clothes drying experience.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <Activity className="h-6 w-6 text-teal-500" />,
                title: "Realtime Monitoring",
                desc: "Monitor temperature, humidity, light, rain condition, and clothesline status from the dashboard."
              },
              {
                icon: <CloudRain className="h-6 w-6 text-sky-500" />,
                title: "Smart Rain Protection",
                desc: "Rain detection helps the system react faster when wet conditions are detected."
              },
              {
                icon: <Smartphone className="h-6 w-6 text-indigo-500" />,
                title: "Remote Dashboard Control",
                desc: "Open, close, switch mode, or restart the device from the dashboard when needed."
              },
              {
                icon: <Bell className="h-6 w-6 text-amber-500" />,
                title: "Telegram Notifications",
                desc: "Receive useful alerts such as rain warning or device status updates. Telegram is used for notifications only, not device commands."
              },
              {
                icon: <Wifi className="h-6 w-6 text-emerald-500" />,
                title: "Device Pairing",
                desc: "Connect Wokwi simulator or real ESP32 devices using device identity and pairing flow."
              },
              {
                icon: <History className="h-6 w-6 text-purple-500" />,
                title: "Automated Scheduling",
                desc: "Create and customize daily schedules to automatically open or close the clothesline."
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

      {/* 5. HOW IT WORKS SECTION */}
      <section id="how-it-works" className="py-20 border-t border-slate-200/50 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest">How It Works</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-white">
              Steps to Get Started
            </h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm sm:text-base">
              Setting up your smart clothesline is simple. Follow this process to connect your device.
            </p>
          </div>

          {/* 6 Steps Flow */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6 mb-16">
            {[
              { step: "1", title: "Setup Device", desc: "Install physical ESP32 hardware or open the Wokwi simulator link." },
              { step: "2", title: "MQTT Link", desc: "Connect the device credentials to the public MQTT broker." },
              { step: "3", title: "Pair Device", desc: "Add your device ID to your profile inside the IoT Hub tab." },
              { step: "4", title: "Open Dashboard", desc: "Monitor active telemetry feeds on the web dashboard." },
              { step: "5", title: "Get Alerts", desc: "Receive immediate notifications inside your Telegram client." },
              { step: "6", title: "Set Schedules", desc: "Automate open/close cycles under user schedule preferences." }
            ].map((step, idx) => (
              <div key={idx} className="relative p-6 rounded-2xl bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-white/5 text-center space-y-3">
                <div className="mx-auto h-8 w-8 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 text-white font-extrabold text-xs flex items-center justify-center shadow-sm">
                  {step.step}
                </div>
                <h3 className="font-bold text-slate-800 dark:text-white text-xs">{step.title}</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>

          {/* Architecture Strip */}
          <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/60 flex flex-col items-center justify-center gap-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">System Architecture Pipeline</p>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs font-bold text-slate-700 dark:text-slate-300">
              <span className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700">ESP32 / Wokwi</span>
              <span className="text-teal-500">➔</span>
              <span className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700">MQTT Broker</span>
              <span className="text-teal-500">➔</span>
              <span className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700">Next.js Dashboard</span>
              <span className="text-teal-500">➔</span>
              <span className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700">Cloud Firestore</span>
            </div>
          </div>
        </div>
      </section>

      {/* 6. PRODUCT PREVIEW SECTION */}
      <section className="py-20 border-t border-slate-200/50 dark:border-white/5 bg-slate-100/40 dark:bg-slate-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest">Interface Previews</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-white">
              Explore the Connected System
            </h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm sm:text-base">
              A breakdown of what you see and manage across the system&apos;s key screens.
            </p>
          </div>

          {/* CSS-Based Mock Panels */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: "Dashboard",
                desc: "Displays active environment telemetry and allows manual opening/closing overrides for active clotheslines.",
                badge: "Realtime View",
                badgeColor: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20",
                preview: (
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl space-y-2 text-[10px]">
                    <div className="flex justify-between border-b pb-1 border-slate-200 dark:border-slate-700">
                      <span className="font-bold">Device: Online</span>
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    </div>
                    <div className="flex justify-between">
                      <span>Temp: 30°C</span>
                      <span className="font-semibold text-teal-500">OPEN</span>
                    </div>
                  </div>
                )
              },
              {
                title: "IoT Hub",
                desc: "Where users add new devices, check token pairing parameters, and configure Wokwi simulator compatibility.",
                badge: "Device Pairing",
                badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
                preview: (
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl space-y-2 text-[10px]">
                    <div className="text-slate-400 font-mono font-bold text-[8px]">PAIRING UTILITY</div>
                    <div className="p-1 rounded bg-white dark:bg-slate-900 border text-center font-mono">esp32_device_xyz</div>
                  </div>
                )
              },
              {
                title: "Telegram Alert",
                desc: "Receives outbound Telegram notifications when weather events trigger automated fallbacks on the device.",
                badge: "Notification Only",
                badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
                preview: (
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl space-y-1 text-[9px]">
                    <div className="font-bold text-indigo-500">Telegram Bot</div>
                    <div className="p-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-slate-700 dark:text-slate-300">
                      ⚠️ Rain detected. Clothesline closed automatically.
                    </div>
                  </div>
                )
              }
            ].map((panel, idx) => (
              <div key={idx} className="p-5 rounded-3xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/50 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${panel.badgeColor}`}>
                    {panel.badge}
                  </span>
                  <h3 className="font-bold text-slate-800 dark:text-white text-sm">{panel.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{panel.desc}</p>
                </div>
                {panel.preview}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. TECHNOLOGY SECTION */}
      <section id="technology" className="py-20 border-t border-slate-200/50 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest">Our Stack</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-white">
              Built on Modern Cloud and IoT Technologies
            </h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm sm:text-base">
              A structured technical roadmap supporting low-latency telemetry transfers and analytical batch reports.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: "ESP32 & Wokwi", desc: "Drives physical sensor loops or simulations with C++ firmware compatibility." },
              { title: "MQTT Broker", desc: "Delivers realtime telemetry and commands between the device and dashboard." },
              { title: "Next.js Dashboard", desc: "React-based web interface showing interactive gauges and settings." },
              { title: "Firebase Firestore", desc: "Acts as the cloud storage mechanism for keeping telemetry archives." },
              { title: "Telegram Bot API", desc: "Sends outbound alerts regarding environmental safety changes." },
              { title: "TypeScript & TSX", desc: "Ensures component type-safety and robust development patterns across dashboard runtimes." },
              { title: "GitHub Actions CI", desc: "Provides automated integration checking to enforce architecture rules." },
              { title: "Zustand & Tailwind", desc: "Coordinates layout styling variables and light/dark theme persistence." }
            ].map((tech, idx) => (
              <div key={idx} className="p-5 rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
                <h4 className="font-extrabold text-slate-800 dark:text-white text-sm">{tech.title}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{tech.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. SAFETY AND CONTROL SECTION */}
      <section id="safety" className="py-20 border-t border-slate-200/50 dark:border-white/5 bg-white dark:bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

            <div className="lg:col-span-7 space-y-6">
              <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest">Trust & Security</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-white">
                Safety and Control Design Choices
              </h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm sm:text-base">
                Control stays clear and predictable. The dashboard is the place for device actions, while Telegram only notifies users when attention is needed.
              </p>

              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="h-5 w-5 rounded bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold text-xs mt-0.5">✓</div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">Centralized Control surface</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      All manual actuation commands are authorized strictly via the authenticated web application dashboard.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="h-5 w-5 rounded bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold text-xs mt-0.5">✓</div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">Notification-Only Telegram Alerts</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Telegram only relays alerts to keep operations safe and prevent command hijacking from exterior interfaces.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="h-5 w-5 rounded bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold text-xs mt-0.5">✓</div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">Local Device Fallback behavior</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      If internet connectivity is lost, the local ESP32 controller closes the line automatically upon detecting rain.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Failsafe mockup visual */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-sm p-6 rounded-3xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-900/50 shadow-xl space-y-4">
                <div className="flex items-center gap-2 text-teal-600">
                  <ShieldCheck className="h-5 w-5" />
                  <span className="font-bold text-xs text-slate-800 dark:text-white">Active Failsafe Status</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border flex justify-between">
                    <span>MQTT Control Port</span>
                    <span className="font-mono text-emerald-500 font-bold">SECURED</span>
                  </div>
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border flex justify-between">
                    <span>Telegram Command Input</span>
                    <span className="font-mono text-rose-500 font-bold">DISABLED</span>
                  </div>
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border flex justify-between">
                    <span>Local Offline Fallback</span>
                    <span className="font-mono text-teal-500 font-bold">ARMED</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 9. USE CASES SECTION */}
      <section className="py-20 border-t border-slate-200/50 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest">Practical Applications</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-white">
              Fits a Variety of Settings
            </h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm sm:text-base">
              A versatile solution tailored for home laundry, educational demonstrations, and commercial operations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {[
              { icon: <Sun className="h-5 w-5 text-teal-500" />, title: "Home Laundry", desc: "Protects family laundry drying at home during unpredictable weather shifts." },
              { icon: <Users className="h-5 w-5 text-indigo-500" />, title: "Boarding Houses", desc: "Assists shared accommodations in managing group clothesline areas collaboratively." },
              { icon: <Smartphone className="h-5 w-5 text-emerald-500" />, title: "Laundry Business", desc: "Helps commercial laundry operators optimize scheduling and safeguard garments." },
              { icon: <BookOpen className="h-5 w-5 text-amber-500" />, title: "IoT Demos", desc: "Serves as an illustrative physical/virtual sandbox setup for student projects." },
              { icon: <Layers className="h-5 w-5 text-purple-500" />, title: "Cloud Learning", desc: "Utilizes structured MQTT, Firestore database, and pipeline data schemas." }
            ].map((uc, idx) => (
              <div key={idx} className="p-5 rounded-3xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/40 flex flex-col justify-between hover:scale-[1.02] transition-transform">
                <div className="space-y-4">
                  <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                    {uc.icon}
                  </div>
                  <h3 className="font-extrabold text-slate-800 dark:text-white text-sm">{uc.title}</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{uc.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. DEMO / CALL TO ACTION SECTION */}
      <section className="relative py-24 bg-gradient-to-br from-teal-600 to-emerald-700 text-white overflow-hidden text-center">
        {/* Background blobs */}
        <div className="absolute top-10 left-10 -z-10 w-[300px] h-[300px] bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 -z-10 w-[300px] h-[300px] bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            Ready to Protect Your Laundry?
          </h2>
          <p className="text-base sm:text-lg text-teal-100 max-w-xl mx-auto leading-relaxed">
            Open the dashboard today to monitor telemetry. Use the Wokwi simulator for demo mode or connect a real ESP32 device for hardware testing.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-2xl bg-white text-teal-700 font-extrabold shadow-xl hover:bg-slate-50 transition-colors text-base"
            >
              Open Dashboard
            </Link>
            <Link
              href="/iot-hub"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-2xl border border-teal-200/30 text-teal-200 hover:text-white hover:bg-white/5 transition-colors font-semibold text-base"
            >
              Configure Device
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
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
            &copy; {new Date().getFullYear()} Smart Clothesline.
          </p>
        </div>
      </footer>

    </div>
  );
}
