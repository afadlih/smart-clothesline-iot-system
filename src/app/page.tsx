import Link from "next/link";
import {
  Sun,
  Cpu,
  CloudRain,
  Smartphone,
  Bell,
  Wifi,
  ShieldCheck,
  Layers,
  Users,
  Activity,
  History
} from "lucide-react";
import LandingHeader from "@/components/landing/LandingHeader";
import InteractiveSimulator from "@/components/landing/InteractiveSimulator";

export const metadata = {
  title: "Smart Clothesline IoT System",
  description:
    "Cloud-connected smart clothesline system with rain detection, realtime dashboard control, Telegram notifications, and analytics.",
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-300 font-sans">
      {/* HEADER / NAVBAR (Client Component for interactive drawer and theme toggle) */}
      <LandingHeader />

      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-32 bg-gradient-to-b from-teal-500/10 via-transparent to-transparent">
        {/* Background Gradients (Lightweight design, no complex blurs) */}
        <div className="absolute top-10 right-10 -z-10 w-72 h-72 bg-teal-500/5 dark:bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

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
                Smart Clothesline uses advanced rain detection to protect your clothes. Check current conditions and control the motor through our secure dashboard.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-500 text-white font-extrabold shadow-md hover:from-teal-500 hover:to-emerald-400 hover:shadow-teal-500/20 transition-all active:scale-95 text-base focus-visible:outline-2 focus-visible:outline-teal-500"
                >
                  Open Dashboard
                </Link>
                <Link
                  href="/iot-hub"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-2xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors font-bold text-slate-700 dark:text-slate-300 text-base focus-visible:outline-2 focus-visible:outline-teal-500"
                >
                  Set Up Device
                </Link>
              </div>

              {/* Status Chips */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-2 pt-4 border-t border-slate-200/50 dark:border-white/5">
                {["Automatic Rain Cover", "Real-Time Alerts", "Mobile Friendly", "Failsafe Design"].map((chip) => (
                  <span key={chip} className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 text-xs font-semibold text-slate-600 dark:text-slate-400">
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            {/* Right Telemetry Widget Simulator (Client Component) */}
            <div className="lg:col-span-5 flex justify-center">
              <InteractiveSimulator />
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
              The Challenges of Drying Clothes Outside
            </h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm sm:text-base">
              Traditional outdoor laundry drying requires constant supervision and weather checking.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "Unexpected Rain",
                desc: "A sudden shower ruins clean laundry when you are away from home, requiring a rewash.",
                color: "border-rose-500/20 bg-rose-500/5 text-rose-500"
              },
              {
                title: "Constant Monitoring",
                desc: "Repeatedly looking outside at the sky is distracting and disrupts your productive schedule.",
                color: "border-amber-500/20 bg-amber-500/5 text-amber-500"
              },
              {
                title: "No Distance Control",
                desc: "You cannot retrieve or shelter the clothes when storm clouds gather while you are away.",
                color: "border-sky-500/20 bg-sky-500/5 text-sky-500"
              },
              {
                title: "Damp Laundry Odors",
                desc: "Getting clothes soaked repeatedly leads to bad smell and reduces fabric durability.",
                color: "border-slate-200 dark:border-white/10 bg-slate-500/5 text-slate-600 dark:text-slate-400"
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
              <div className="w-full max-w-sm p-6 rounded-3xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/50 shadow-lg relative space-y-6">
                <div className="font-bold text-slate-800 dark:text-white text-sm">Laundry Protection Pipeline</div>

                <div className="space-y-4 text-xs">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-teal-50 dark:bg-teal-500/5 border border-teal-200/50 dark:border-teal-500/10">
                    <div className="h-6 w-6 rounded bg-teal-500 text-white font-bold flex items-center justify-center">1</div>
                    <p className="text-slate-700 dark:text-slate-300">Weather sensors monitor moisture levels continuously.</p>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-sky-50 dark:bg-sky-500/5 border border-sky-200/50 dark:border-sky-500/10">
                    <div className="h-6 w-6 rounded bg-sky-500 text-white font-bold flex items-center justify-center">2</div>
                    <p className="text-slate-700 dark:text-slate-300">Device pulls clothes inside when rain drops are detected.</p>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200/50 dark:border-emerald-500/10">
                    <div className="h-6 w-6 rounded bg-emerald-500 text-white font-bold flex items-center justify-center">3</div>
                    <p className="text-slate-700 dark:text-slate-300">Instant push notifications alert your Telegram app.</p>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-500/5 border border-slate-200/50 dark:border-slate-500/10">
                    <div className="h-6 w-6 rounded bg-slate-500 text-white font-bold flex items-center justify-center">4</div>
                    <p className="text-slate-700 dark:text-slate-300">Laundry remains safe, dry, and clean outdoor.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Copy */}
            <div className="lg:col-span-7 order-1 lg:order-2 space-y-6">
              <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest">Our Solution</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-white">
                How Smart Clothesline Works
              </h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm sm:text-base">
                Smart Clothesline integrates local sensors, device automation, a cloud database, and instant Telegram notifications to help users monitor drying status.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-teal-500 font-bold" aria-hidden="true">✓</span>
                    <h3 className="font-bold text-slate-800 dark:text-white text-sm">Automated Safety Cover</h3>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Instantly retrieves your laundry when rain drops touch the sensor grid.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-teal-500 font-bold" aria-hidden="true">✓</span>
                    <h3 className="font-bold text-slate-800 dark:text-white text-sm">Real-time Weather Feed</h3>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Check temperature, humidity, and light levels in your drying zone from anywhere.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-teal-500 font-bold" aria-hidden="true">✓</span>
                    <h3 className="font-bold text-slate-800 dark:text-white text-sm">Instant Mobile Alerts</h3>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Receive push messages on Telegram immediately after clothesline movements.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-teal-500 font-bold" aria-hidden="true">✓</span>
                    <h3 className="font-bold text-slate-800 dark:text-white text-sm">Worry-free Drying</h3>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Leave home with complete peace of mind, knowing your laundry is protected.
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
              Everything you need to automate laundry care, view analytics, and control your device.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <Activity className="h-6 w-6 text-teal-500" aria-hidden="true" />,
                title: "Realtime Monitoring",
                desc: "Monitor temperature, humidity, light levels, rain status, and clothesline position from your dashboard."
              },
              {
                icon: <CloudRain className="h-6 w-6 text-sky-500" aria-hidden="true" />,
                title: "Smart Rain Protection",
                desc: "Instant rain detection triggers immediate motor action to pull laundry inside safely."
              },
              {
                icon: <Smartphone className="h-6 w-6 text-indigo-500" aria-hidden="true" />,
                title: "Remote Dashboard Control",
                desc: "Open, close, switch mode, or restart your smart device from the cloud dashboard."
              },
              {
                icon: <Bell className="h-6 w-6 text-amber-500" aria-hidden="true" />,
                title: "Telegram Notifications",
                desc: "Receive alerts for rain warnings or device changes. Telegram is notification-only, not for commands."
              },
              {
                icon: <Wifi className="h-6 w-6 text-emerald-500" aria-hidden="true" />,
                title: "Device Pairing",
                desc: "Connect your hardware unit or simulation profile securely using simple device registration."
              },
              {
                icon: <History className="h-6 w-6 text-purple-500" aria-hidden="true" />,
                title: "Analytics and Big Data",
                desc: "Review drying efficiency trends, historical weather logs, and Hadoop batch analytics roadmaps."
              }
            ].map((feat, idx) => (
              <div
                key={idx}
                className="p-6 rounded-3xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/50 hover:shadow-lg transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1"
              >
                <div className="space-y-4">
                  <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center transition-transform group-hover:scale-110">
                    {feat.icon}
                  </div>
                  <h3 className="font-extrabold text-slate-800 dark:text-white text-base leading-snug">{feat.title}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{feat.desc}</p>
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
              Simple Steps to Get Started
            </h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm sm:text-base">
              Set up your smart clothesline system and automate laundry drying in minutes.
            </p>
          </div>

          {/* Steps Flow */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6">
            {[
              { step: "1", title: "Place Device", desc: "Install the weather-monitoring clothesline unit outdoors." },
              { step: "2", title: "Connect Wi-Fi", desc: "Link the clothesline to your local home internet connection." },
              { step: "3", title: "Pair Account", desc: "Register your secure device ID under the IoT Hub dashboard." },
              { step: "4", title: "View Dashboard", desc: "Monitor weather feeds, check telemetry, and control motor modes." },
              { step: "5", title: "Receive Alerts", desc: "Receive immediate notifications inside your Telegram chat client." },
              { step: "6", title: "Review Trends", desc: "Track weather patterns, sensor telemetry, and analytics history." }
            ].map((step, idx) => (
              <div key={idx} className="relative p-6 rounded-2xl bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-white/5 text-center space-y-3">
                <div className="mx-auto h-8 w-8 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 text-white font-extrabold text-xs flex items-center justify-center shadow-sm">
                  {step.step}
                </div>
                <h3 className="font-bold text-slate-800 dark:text-white text-xs">{step.title}</h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. CONNECTED SYSTEM PREVIEWS */}
      <section className="py-20 border-t border-slate-200/50 dark:border-white/5 bg-slate-100/40 dark:bg-slate-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest">Interface Previews</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-white">
              Explore the Connected System
            </h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm sm:text-base">
              Clear, modern user interfaces designed to help you monitor weather and manage devices.
            </p>
          </div>

          {/* CSS-Based Mock Panels */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {[
              {
                title: "Dashboard",
                desc: "Displays active weather readings and allows manual override controls for your smart clothesline.",
                badge: "Realtime View",
                badgeColor: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20",
                link: "/dashboard",
                linkText: "Open Dashboard",
                preview: (
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl space-y-2 text-[10px]">
                    <div className="flex justify-between border-b pb-1 border-slate-200 dark:border-slate-700">
                      <span className="font-bold">Device Status</span>
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    </div>
                    <div className="flex justify-between">
                      <span>Temp: 30°C</span>
                      <span className="font-semibold text-teal-500">Drying</span>
                    </div>
                  </div>
                )
              },
              {
                title: "IoT Hub",
                desc: "Easily pair your smart clothesline units and view active telemetry status in one place.",
                badge: "Device Pairing",
                badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
                link: "/iot-hub",
                linkText: "Set Up Device",
                preview: (
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl space-y-2 text-[10px]">
                    <div className="text-slate-600 dark:text-slate-400 font-bold text-[8px]">DEVICE SETUP</div>
                    <div className="p-1 rounded bg-white dark:bg-slate-900 border text-center font-mono">device_id_123</div>
                  </div>
                )
              },
              {
                title: "Analytics",
                desc: "Review daily environmental data, temperature, humidity and rainfall records.",
                badge: "Data Trends",
                badgeColor: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20",
                link: "/analytics",
                linkText: "View Analytics",
                preview: (
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl space-y-2 text-[10px]">
                    <div className="flex items-end justify-between h-8 px-2 pt-2 border-b border-slate-300 dark:border-slate-700">
                      <div className="w-1.5 h-4 bg-teal-500" />
                      <div className="w-1.5 h-6 bg-teal-500" />
                      <div className="w-1.5 h-5 bg-teal-400" />
                    </div>
                  </div>
                )
              },
              {
                title: "Big Data Report",
                desc: "Summarizes export files for daily weather statistics and Hadoop batch analytics report roadmaps.",
                badge: "Hadoop Batch",
                badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20",
                link: "/big-data",
                linkText: "View Big Data Report",
                preview: (
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl space-y-2 text-[10px] font-mono">
                    <div className="text-[8px] text-purple-650 dark:text-purple-400">MAPREDUCE_ETL.CSV</div>
                    <div className="text-[8px] text-slate-600 dark:text-slate-400">Rain events total: 14</div>
                  </div>
                )
              },
              {
                title: "Telegram Alerts",
                desc: "Receives Telegram notifications when weather events trigger automated failsafes on the device.",
                badge: "Notification Only",
                badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
                link: "/dashboard",
                linkText: "Telegram Bot Setup",
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
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{panel.desc}</p>
                </div>
                {panel.preview}
                <Link
                  href={panel.link}
                  className="inline-flex items-center text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline pt-2 focus-visible:outline-2 focus-visible:outline-teal-500"
                >
                  {panel.linkText} &rarr;
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. SAFETY AND CONTROL SECTION */}
      <section id="safety" className="py-20 border-t border-slate-200/50 dark:border-white/5 bg-white dark:bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest">Designed for Safety</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-white">
                Built-In Safety & Offline Fallbacks
              </h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm sm:text-base">
                Your clothes are safe even when internet drops. Control stays clear and predictable through secure dashboard environments.
              </p>

              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="h-5 w-5 rounded bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold text-xs mt-0.5">✓</div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-white text-sm">Secure Manual Control</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Only authorized users can trigger manual clothesline cover adjustments through the secure app dashboard.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="h-5 w-5 rounded bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold text-xs mt-0.5">✓</div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-white text-sm">Local Failsafe Protection</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      If home Wi-Fi drops, the local rain sensor automatically pulls in the clothesline at the first drop of moisture.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="h-5 w-5 rounded bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold text-xs mt-0.5">✓</div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-white text-sm">Notification-Only Telegram Alerts</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Telegram only forwards alerts and warnings to keep transactions simple and prevent remote command hacking.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Failsafe mockup visual */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-sm p-6 rounded-3xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-900/50 shadow-md space-y-4">
                <div className="flex items-center gap-2 text-teal-600">
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                  <span className="font-bold text-xs text-slate-800 dark:text-white">Active Failsafe System</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-white/5 flex justify-between">
                    <span>Local Offline Fallback</span>
                    <span className="font-semibold text-teal-600 dark:text-teal-400">ENABLED</span>
                  </div>
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-white/5 flex justify-between">
                    <span>Telegram Control Interface</span>
                    <span className="font-semibold text-rose-500">DISABLED (Read-Only)</span>
                  </div>
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-white/5 flex justify-between">
                    <span>Power Loss Protection</span>
                    <span className="font-semibold text-emerald-500">ACTIVE</span>
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
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest">Use Cases</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-white">
              Perfect for Every Drying Space
            </h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm sm:text-base">
              A versatile solution tailored for home laundry, apartments, boarding houses, and commercial settings.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {[
              { icon: <Sun className="h-5 w-5 text-teal-500" aria-hidden="true" />, title: "Home Laundry", desc: "Protects family laundry drying in yards or gardens during sudden storms." },
              { icon: <Users className="h-5 w-5 text-indigo-500" aria-hidden="true" />, title: "Boarding Houses", desc: "Assists shared accommodations in managing group clothesline areas collaboratively." },
              { icon: <Smartphone className="h-5 w-5 text-emerald-500" aria-hidden="true" />, title: "Apartments & Balconies", desc: "Optimizes small outdoor drying zones with time-saving automation." },
              { icon: <History className="h-5 w-5 text-amber-500" aria-hidden="true" />, title: "Busy Lifestyles", desc: "Gives peace of mind to professionals who spend hours away at work or study." },
              { icon: <Layers className="h-5 w-5 text-purple-500" aria-hidden="true" />, title: "Laundry Businesses", desc: "Helps small laundry operators safeguard drying garments from variable weather." }
            ].map((uc, idx) => (
              <div key={idx} className="p-5 rounded-3xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/40 flex flex-col justify-between hover:scale-[1.02] transition-transform">
                <div className="space-y-4">
                  <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                    {uc.icon}
                  </div>
                  <h3 className="font-extrabold text-slate-800 dark:text-white text-sm">{uc.title}</h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">{uc.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. CALL TO ACTION SECTION */}
      <section className="relative py-24 bg-gradient-to-br from-teal-600 to-emerald-700 text-white overflow-hidden text-center">
        {/* Background blobs (subtle) */}
        <div className="absolute top-10 left-10 -z-10 w-72 h-72 bg-white/5 rounded-full blur-2xl pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            Ready to Protect Your Laundry?
          </h2>
          <p className="text-base sm:text-lg text-teal-100 max-w-xl mx-auto leading-relaxed">
            Open the dashboard today to monitor telemetry. Keep laundry fresh, clean, and dry without constantly watching the sky.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-2xl bg-white text-teal-700 font-extrabold shadow-md hover:bg-slate-50 transition-colors text-base focus-visible:outline-2 focus-visible:outline-white"
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
              <Cpu className="h-4.5 w-4.5" aria-hidden="true" />
            </div>
            <span className="font-bold text-sm text-slate-700 dark:text-slate-300">
              Smart Clothesline
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400">
            &copy; {new Date().getFullYear()} Smart Clothesline.
          </p>
        </div>
      </footer>
    </div>
  );
}
