"use client";

import { useState, useEffect } from "react";
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
  Menu,
  X,
  Activity,
  History
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
  const [clotheslineState, setClotheslineState] = useState<"OPEN" | "CLOSED">("OPEN");
  const [temp, setTemp] = useState(30.2);
  const [humidity, setHumidity] = useState(54);


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

  // Event handlers for simulation
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
          <p className="text-sm font-medium text-slate-500 animate-pulse">Loading...</p>
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
              <a href="#safety" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Safety</a>
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
              href="#safety"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 font-semibold text-sm"
            >
              Safety
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

      {/* 2. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-32 bg-gradient-to-b from-teal-500/10 via-transparent to-transparent">
        {/* Background Gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 w-[500px] h-[500px] bg-gradient-to-br from-teal-300/20 to-sky-300/20 dark:from-teal-900/10 dark:to-sky-900/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">

            {/* Left Copy */}
            <div className="lg:col-span-7 text-center lg:text-left space-y-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-xs font-bold text-teal-600 dark:text-teal-400 tracking-wider uppercase">
                Smart Home Technology
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15] text-slate-800 dark:text-white">
                Protect your laundry from{" "}
                <span className="bg-gradient-to-r from-teal-600 to-sky-500 dark:from-teal-400 dark:to-sky-400 bg-clip-text text-transparent">
                  unexpected rain.
                </span>
              </h1>
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Smart Clothesline automatically detects rain and retrieves your clothes. Monitor conditions and control it from anywhere with our simple dashboard.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-500 text-white font-extrabold shadow-lg hover:from-teal-500 hover:to-emerald-400 hover:shadow-teal-500/20 transition-all active:scale-95 text-base"
                >
                  Open Dashboard
                </Link>
              </div>

              {/* Status Chips */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-2 pt-4 border-t border-slate-200/50 dark:border-white/5">
                {["Automatic Rain Cover", "Real-Time Alerts", "Mobile Friendly", "Failsafe Design"].map((chip) => (
                  <span key={chip} className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            {/* Right Telemetry Widget Mockup */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-6 shadow-2xl backdrop-blur-xl transition-all duration-300 relative">
                <div className="absolute top-4 right-4 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Interactive Preview</span>
                </div>

                <div className="mb-6">
                  <h3 className="font-extrabold text-slate-800 dark:text-white text-base">Your Smart Clothesline</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Try simulating weather changes below</p>
                </div>

                {/* Status Indicator */}
                <div className="mb-6 p-4 rounded-2xl bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/5 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-550 dark:text-slate-400">Clothesline Cover:</span>
                  <span className={`px-4 py-1.5 rounded-full text-xs font-black transition-all ${clotheslineState === "OPEN"
                      ? "bg-teal-150/40 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400 border border-teal-500/20"
                      : "bg-rose-100/40 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-500/20"
                    }`}>
                    {clotheslineState === "OPEN" ? "☀️ OPEN (Drying)" : "🌧️ CLOSED (Protected)"}
                  </span>
                </div>

                {/* Grid Readings */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-white/5 flex items-center gap-3">
                    <Thermometer className="h-5 w-5 text-amber-500" />
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">Temperature</p>
                      <p className="text-sm font-extrabold text-slate-800 dark:text-white">{temp.toFixed(1)}°C</p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-white/5 flex items-center gap-3">
                    <Droplets className="h-5 w-5 text-sky-500" />
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">Humidity</p>
                      <p className="text-sm font-extrabold text-slate-800 dark:text-white">{humidity}%</p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-white/5 flex items-center gap-3">
                    {isRainy ? <CloudRain className="h-5 w-5 text-sky-500 animate-bounce" /> : <Sun className="h-5 w-5 text-amber-500 animate-spin-slow" />}
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">Weather</p>
                      <p className={`text-xs font-black ${isRainy ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {isRainy ? "Raining" : "Clear & Sunny"}
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-white/5 flex items-center gap-3">
                    <Wifi className="h-5 w-5 text-emerald-500" />
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">Status</p>
                      <p className="text-xs font-bold text-emerald-500">Connected</p>
                    </div>
                  </div>
                </div>

                {/* Simulation Button */}
                <button
                  onClick={isRainy ? handleSimulateSunny : handleSimulateRainy}
                  className={`w-full py-3.5 px-4 rounded-2xl text-xs font-bold border transition-all active:scale-[0.98] ${isRainy
                      ? "bg-gradient-to-r from-emerald-600 to-teal-500 border-emerald-600 text-white shadow-md shadow-emerald-500/20"
                      : "bg-gradient-to-r from-rose-600 to-orange-500 border-rose-600 text-white shadow-md shadow-rose-500/20"
                    }`}
                >
                  {isRainy ? "☀️ Clear Weather & Dry Clothes" : "🌧️ Simulate Sudden Rain"}
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3. PROBLEM SECTION */}
      <section id="problems" className="py-20 border-t border-slate-200/50 dark:border-white/5 bg-white dark:bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <span className="text-xs font-bold text-rose-500 uppercase tracking-widest">Why This Exists</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-white">
              The Challenges of Drying Clothes
            </h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm sm:text-base">
              Traditional outdoor drying comes with constant worry and sudden weather changes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "Unexpected Rain",
                desc: "A sudden afternoon shower ruins freshly washed clothes while you are busy or away from home.",
                color: "border-rose-500/20 bg-rose-500/5 text-rose-500"
              },
              {
                title: "Constant Monitoring",
                desc: "Juggling your schedule just to look outside and check if the clouds are getting grey is distracting.",
                color: "border-amber-500/20 bg-amber-500/5 text-amber-500"
              },
              {
                title: "No Way to Act",
                desc: "Even if you notice the storm coming, you cannot pull in the clothesline if you are stuck in traffic or at work.",
                color: "border-sky-500/20 bg-sky-500/5 text-sky-500"
              },
              {
                title: "Damp & Odorous Laundry",
                desc: "Getting clothes soaked repeatedly leads to bad odors and requires washing them all over again.",
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
                <h4 className="font-bold text-slate-800 dark:text-white text-sm">How Automation Protects Laundry</h4>

                <div className="space-y-4 text-xs">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-teal-50 dark:bg-teal-500/5 border border-teal-200/50 dark:border-teal-500/10">
                    <div className="h-6 w-6 rounded bg-teal-500 text-white font-bold flex items-center justify-center">1</div>
                    <p className="text-slate-700 dark:text-slate-300">Sensors detect rain droplets instantly.</p>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-sky-50 dark:bg-sky-500/5 border border-sky-200/50 dark:border-sky-500/10">
                    <div className="h-6 w-6 rounded bg-sky-500 text-white font-bold flex items-center justify-center">2</div>
                    <p className="text-slate-700 dark:text-slate-300">Motor automatically retracts or covers the clothesline.</p>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200/50 dark:border-emerald-500/10">
                    <div className="h-6 w-6 rounded bg-emerald-500 text-white font-bold flex items-center justify-center">3</div>
                    <p className="text-slate-700 dark:text-slate-300">A push notification is sent directly to your phone.</p>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-500/5 border border-slate-200/50 dark:border-slate-500/10">
                    <div className="h-6 w-6 rounded bg-slate-500 text-white font-bold flex items-center justify-center">4</div>
                    <p className="text-slate-700 dark:text-slate-300">Laundry remains completely safe, dry, and clean.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Copy */}
            <div className="lg:col-span-7 order-1 lg:order-2 space-y-6">
              <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest">Our Solution</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-white">
                Automated Laundry Protection
              </h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm sm:text-base">
                Smart Clothesline combines weather sensors, motor automation, a mobile-friendly dashboard, and instant notifications to keep your laundry safe without any human effort.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-teal-500 font-bold">✓</span>
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">Automated Safety Cover</h4>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Automatically pulls clothes inside when rain drops are detected, saving laundry while you are away.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-teal-500 font-bold">✓</span>
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">Real-time Weather Feed</h4>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Check the ambient temperature, light levels, and humidity around your drying area on your phone.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-teal-500 font-bold">✓</span>
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">Instant Mobile Alerts</h4>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Get an instant notification whenever the system reacts to rain or changes its open/close state.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-teal-500 font-bold">✓</span>
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">Worry-free Mornings</h4>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Hang your clothes out and leave for work knowing they will stay protected regardless of sudden storms.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 5. CORE FEATURES SECTION */}
      <section id="features" className="py-20 border-t border-slate-200/50 dark:border-white/5 bg-slate-100/40 dark:bg-slate-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest">Key Features</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-white">
              Designed for Convenience and Comfort
            </h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm sm:text-base">
              Everything you need to automate laundry care and monitor drying weather effortlessly.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <Activity className="h-6 w-6 text-teal-500" />,
                title: "Realtime Monitoring",
                desc: "Monitor temperature, humidity, light, rain conditions, and cover status from your personal dashboard."
              },
              {
                icon: <CloudRain className="h-6 w-6 text-sky-500" />,
                title: "Smart Rain Detection",
                desc: "Low-latency rain sensors trigger automated line retrieval as soon as moisture is detected."
              },
              {
                icon: <Smartphone className="h-6 w-6 text-indigo-500" />,
                title: "Remote Dashboard Control",
                desc: "Open, close, or switch modes manually from anywhere in the world using a clean web browser."
              },
              {
                icon: <Bell className="h-6 w-6 text-amber-500" />,
                title: "Telegram Alerts",
                desc: "Receive immediate updates directly to your chat app of choice for quick warnings and peace of mind."
              },
              {
                icon: <Wifi className="h-6 w-6 text-emerald-500" />,
                title: "Instant Connection",
                desc: "Easily pair your smart clothesline unit using a secure ID and simple setup wizard."
              },
              {
                icon: <History className="h-6 w-6 text-purple-500" />,
                title: "Automated Scheduling",
                desc: "Configure automated open and close times to match the daylight and your daily schedule."
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
      <section id="how-it-works" className="py-20 border-t border-slate-200/50 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest">How It Works</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-white">
              Simple Steps to Dry Laundry safely
            </h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm sm:text-base">
              Set up your smart clothesline system and automate laundry drying in minutes.
            </p>
          </div>

          {/* 6 Steps Flow */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6">
            {[
              { step: "1", title: "Place Device", desc: "Install the smart clothesline unit in your outdoor drying area." },
              { step: "2", title: "Connect Wi-Fi", desc: "Link the unit to your home wireless network for internet access." },
              { step: "3", title: "Pair Account", desc: "Enter your device ID in the settings dashboard to register." },
              { step: "4", title: "Track Weather", desc: "Open the dashboard to view temperature and humidity levels." },
              { step: "5", title: "Stay Notified", desc: "Receive immediate notifications when weather events occur." },
              { step: "6", title: "Enjoy Freshness", desc: "Keep clothes clean and dry with zero effort and absolute peace." }
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
        </div>
      </section>

      {/* 7. PRODUCT PREVIEW SECTION */}
      <section className="py-20 border-t border-slate-200/50 dark:border-white/5 bg-slate-100/40 dark:bg-slate-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest">Interface Previews</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-white">
              Explore the Connected System
            </h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm sm:text-base">
              Our applications are built to be clear, responsive, and easy to use.
            </p>
          </div>

          {/* CSS-Based Mock Panels */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: "Dashboard",
                desc: "Displays active weather readings and allows manual override controls for your smart clothesline.",
                badge: "Realtime View",
                badgeColor: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20",
                preview: (
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl space-y-2 text-[10px]">
                    <div className="flex justify-between border-b pb-1 border-slate-200 dark:border-slate-700">
                      <span className="font-bold">Device Status</span>
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <div className="flex justify-between">
                      <span>Temp: 30°C</span>
                      <span className="font-semibold text-teal-500">Drying</span>
                    </div>
                  </div>
                )
              },
              {
                title: "Device Pairing",
                desc: "Easily connect new physical smart units or test simulation parameters in one click.",
                badge: "Simple Setup",
                badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
                preview: (
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl space-y-2 text-[10px]">
                    <div className="text-slate-400 font-bold text-[8px]">DEVICE SETUP</div>
                    <div className="p-1 rounded bg-white dark:bg-slate-900 border text-center font-mono">device_id_123</div>
                  </div>
                )
              },
              {
                title: "Telegram Alerts",
                desc: "Get instant alerts regarding cover movements directly on your mobile device chat screen.",
                badge: "Mobile Alerts",
                badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
                preview: (
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl space-y-1 text-[9px]">
                    <div className="font-bold text-indigo-500">Alert Bot</div>
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

      {/* 8. SAFETY AND CONTROL SECTION */}
      <section id="safety" className="py-20 border-t border-slate-200/50 dark:border-white/5 bg-white dark:bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

            <div className="lg:col-span-7 space-y-6">
              <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest">Designed for Safety</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-white">
                Built-In Safety & Offline Fallbacks
              </h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm sm:text-base">
                Your clothes are safe even when conditions change. Control stays clear and predictable through secure settings.
              </p>

              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="h-5 w-5 rounded bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold text-xs mt-0.5">✓</div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">Secure Manual Control</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Only authorized users can control the clothesline cover manually through the secure dashboard app.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="h-5 w-5 rounded bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold text-xs mt-0.5">✓</div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">Local Failsafe Protection</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      If internet connectivity drops, the local rain sensor automatically pulls in laundry at the first sign of moisture.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="h-5 w-5 rounded bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold text-xs mt-0.5">✓</div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">Notification-Only Telegram Alerts</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Telegram is notification-only. It keeps you informed without exposing control routes to unwanted messages.
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
                  <span className="font-bold text-xs text-slate-800 dark:text-white">Active Failsafe System</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border flex justify-between">
                    <span>Local Offline Fallback</span>
                    <span className="font-semibold text-teal-600 dark:text-teal-400">ENABLED</span>
                  </div>
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border flex justify-between">
                    <span>Telegram Control Interface</span>
                    <span className="font-semibold text-rose-500">DISABLED (Read-Only)</span>
                  </div>
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border flex justify-between">
                    <span>Power Loss Protection</span>
                    <span className="font-semibold text-emerald-500">ACTIVE</span>
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
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest">Use Cases</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-white">
              Perfect for Every drying Space
            </h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm sm:text-base">
              A versatile solution tailored for home laundry, apartments, boarding houses, and commercial settings.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {[
              { icon: <Sun className="h-5 w-5 text-teal-500" />, title: "Home Laundry", desc: "Protects family laundry drying in yards or gardens during sudden storms." },
              { icon: <Users className="h-5 w-5 text-indigo-500" />, title: "Boarding Houses", desc: "Assists shared accommodations in managing group clothesline areas collaboratively." },
              { icon: <Smartphone className="h-5 w-5 text-emerald-500" />, title: "Apartments & Balconies", desc: "Optimizes small outdoor drying zones with time-saving automation." },
              { icon: <History className="h-5 w-5 text-amber-500" />, title: "Busy Lifestyles", desc: "Gives peace of mind to professionals who spend hours away at work or study." },
              { icon: <Layers className="h-5 w-5 text-purple-500" />, title: "Laundry Businesses", desc: "Helps small laundry operators safeguard drying garments from variable weather." }
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
            Open the dashboard today to monitor telemetry. Keep your laundry fresh, clean, and dry without constantly watching the sky.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-2xl bg-white text-teal-700 font-extrabold shadow-xl hover:bg-slate-50 transition-colors text-base"
            >
              Open Dashboard
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
              Smart Clothesline
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
