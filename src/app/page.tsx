"use client";

import { DecisionEngine } from "@/features/dashboard/DecisionEngine";
import SensorCard from "@/components/cards/SensorCard";
import StatusPanel from "@/components/status/StatusPanel";
import { useSensor } from "@/hooks/useSensor";

export default function Home() {
  const sensor = useSensor();
  const lastUpdated = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const isDark = sensor?.isDark();
  const isRaining = sensor?.isRaining();

  if (!sensor) {
    return (
      <main className="bg-gradient-to-br from-gray-100 to-gray-200 min-h-screen">
        <div className="max-w-6xl mx-auto p-6 space-y-8">
          <header className="space-y-3">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Smart Clothesline Dashboard
              </h1>
              <p className="text-gray-500 mt-1">
                Real-time IoT monitoring dashboard
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
              <span>Last updated: --:--</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                <span className="h-2 w-2 rounded-full bg-green-500" aria-hidden="true" />
                ONLINE
              </span>
              <span className="text-xs text-gray-400">Updating every 3 seconds...</span>
            </div>
            <div className="h-px bg-gray-200" />
          </header>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-gray-500">Loading dashboard...</p>
          </div>
        </div>
      </main>
    );
  }

  const status = DecisionEngine.getClotheslineStatus(sensor);
  const reason = DecisionEngine.getReason(sensor);

  return (
    <main className="bg-gradient-to-br from-gray-100 to-gray-200 min-h-screen">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        <header className="space-y-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Smart Clothesline Dashboard
            </h1>
            <p className="text-gray-500 mt-1">Real-time IoT monitoring dashboard</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
            <span>Last updated: {lastUpdated}</span>
            <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
              <span className="h-2 w-2 rounded-full bg-green-500" aria-hidden="true" />
              ONLINE
            </span>
            <span className="text-xs text-gray-400">Updating every 3 seconds...</span>
          </div>
          <div className="h-px bg-gray-200" />
        </header>

        <StatusPanel status={status} reason={reason} />

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Sensor Data</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <SensorCard
              title="Temperature"
              value={`${sensor.temperature} °C`}
              subtitle="Ambient"
            />
            <SensorCard title="Humidity" value={`${sensor.humidity} %`} subtitle="Relative" />
            <SensorCard
              title="Light"
              value={sensor.light.toFixed(0)}
              subtitle={isDark ? "Low light" : "Normal"}
              accent={isDark ? "warning" : undefined}
            />
            <SensorCard
              title="Rain"
              value={isRaining ? "Detected" : "Clear"}
              subtitle={isRaining ? "Umbrella needed" : "No rain"}
              accent={isRaining ? "danger" : undefined}
            />
          </div>
        </section>
      </div>
    </main>
  );
}