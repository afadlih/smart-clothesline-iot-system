"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Cpu, RefreshCw, Wifi } from "lucide-react";
import PageContainer from "@/components/layout/PageContainer";
import PairingDeviceSettings, { type PairableDevice } from "@/features/settings/PairingDeviceSettings";
import { useSystemState } from "@/hooks/useSystemState";
import { mqttService, PAIRING_DISCOVERY_TOPIC, type PairingDiscoveryMessage } from "@/services/MQTTService";

const DEVICES_STORAGE_KEY = "smart-clothesline-devices-v1";
const ACTIVE_DEVICE_STORAGE_KEY = "smart-clothesline-active-device-id-v1";

const initialDevices: PairableDevice[] = [
  { id: "wokwi-default", name: "Wokwi Simulator", signal: "Testing device", status: "Available", source: "wokwi" },
];

export default function IoTHubPage() {
  const { connection, mqttConnected, deviceConfig, serialLogs, lastUpdate, debug, operationalHealth } = useSystemState();
  const [devices, setDevices] = useState<PairableDevice[]>(initialDevices);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(DEVICES_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { devices?: PairableDevice[]; selectedDeviceId?: string | null };
        if (Array.isArray(parsed.devices)) setDevices(parsed.devices);
        if (typeof parsed.selectedDeviceId === "string" || parsed.selectedDeviceId === null) setSelectedDeviceId(parsed.selectedDeviceId ?? null);
      } catch {
        localStorage.removeItem(DEVICES_STORAGE_KEY);
      }
    }
    const active = localStorage.getItem(ACTIVE_DEVICE_STORAGE_KEY);
    if (active) setSelectedDeviceId(active);
  }, []);

  useEffect(() => {
    localStorage.setItem(DEVICES_STORAGE_KEY, JSON.stringify({ devices, selectedDeviceId }));
    if (selectedDeviceId) localStorage.setItem(ACTIVE_DEVICE_STORAGE_KEY, selectedDeviceId);
  }, [devices, selectedDeviceId]);

  useEffect(() => {
    const unsubscribe = mqttService.subscribeTopic(PAIRING_DISCOVERY_TOPIC, (rawPayload) => {
      try {
        const payload = JSON.parse(rawPayload) as Partial<PairingDiscoveryMessage>;
        if (typeof payload.deviceId !== "string" || typeof payload.deviceName !== "string") return;
        const next: PairableDevice = {
          id: payload.deviceId,
          name: payload.deviceName,
          signal: payload.ipAddress ? `IP: ${payload.ipAddress}` : "ESP32 discovery",
          status: typeof payload.status === "string" ? payload.status : "pairable",
          source: "esp32",
          pairingCode: typeof payload.pairingCode === "string" ? payload.pairingCode : undefined,
          ipAddress: typeof payload.ipAddress === "string" ? payload.ipAddress : undefined,
          lastSeenAt: Date.now(),
        };
        setDevices((prev) => [next, ...prev.filter((item) => item.id !== next.id)].slice(0, 10));
      } catch {
        // noop
      }
    });
    return unsubscribe;
  }, []);

  const selectedDevice = devices.find((item) => item.id === selectedDeviceId) ?? null;
  const reconnectAttempts = useMemo(
    () => serialLogs.filter((log) => log.message.toLowerCase().includes("reconnect")).length,
    [serialLogs],
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-900 dark:to-slate-950">
      <PageContainer className="space-y-5">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">IoT Hub</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Device management console for pairing, connection health, sync, and diagnostics.</p>
        </header>

        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="text-xs uppercase tracking-wide text-slate-500">MQTT Connection</p><p className="mt-1 text-lg font-semibold">{mqttConnected ? "Online" : "Offline"}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="text-xs uppercase tracking-wide text-slate-500">Latest Heartbeat</p><p className="mt-1 text-lg font-semibold">{lastUpdate ? new Date(lastUpdate).toLocaleTimeString("en-US") : "-"}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="text-xs uppercase tracking-wide text-slate-500">Reconnect Attempts</p><p className="mt-1 text-lg font-semibold">{reconnectAttempts}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="text-xs uppercase tracking-wide text-slate-500">Sync Status</p><p className="mt-1 text-lg font-semibold">{deviceConfig.syncState}</p></div>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <PairingDeviceSettings
              discoveredDevices={devices}
              selectedDeviceId={selectedDeviceId}
              isScanning={isScanning}
              onScan={() => {
                setIsScanning(true);
                window.setTimeout(() => setIsScanning(false), 1200);
              }}
              onSelectDevice={(deviceId) => setSelectedDeviceId(deviceId)}
            />
          </div>

          <aside className="space-y-4 xl:col-span-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Device Console</h2>
              <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                <p className="flex items-center gap-2"><Cpu size={14} /> Device: {selectedDevice?.name ?? "No device selected"}</p>
                <p className="flex items-center gap-2"><Wifi size={14} /> Broker: {connection.state}</p>
                <p className="flex items-center gap-2"><Activity size={14} /> Last ACK: {debug.lastAckResult}</p>
                <p className="flex items-center gap-2"><RefreshCw size={14} /> Queue Backlog: {operationalHealth.queueBacklog}</p>
                <p className="flex items-center gap-2"><Activity size={14} /> Drift: {operationalHealth.statusDriftMs ?? 0} ms</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Firmware & Sync</h2>
              <div className="mt-3 space-y-2 text-sm">
                <p className="text-slate-700 dark:text-slate-200">Firmware: v1.0 (simulation)</p>
                <p className="text-slate-700 dark:text-slate-200">Last Sync: {deviceConfig.lastSyncAt ? new Date(deviceConfig.lastSyncAt).toLocaleString("en-US") : "-"}</p>
                <p className="text-slate-700 dark:text-slate-200">Sync Message: {deviceConfig.syncMessage}</p>
                <p className="text-slate-700 dark:text-slate-200">Signal Quality: {mqttConnected ? "Good" : "Unavailable"}</p>
              </div>
            </div>
          </aside>
        </section>
      </PageContainer>
    </main>
  );
}
