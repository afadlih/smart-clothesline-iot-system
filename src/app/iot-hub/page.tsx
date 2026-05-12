"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Cpu, RefreshCw, Wifi, Radio, Zap, ShieldAlert, Binary } from "lucide-react";
import PageContainer from "@/components/layout/PageContainer";
import PairingDeviceSettings, { type PairableDevice } from "@/features/settings/PairingDeviceSettings";
import { useSystemState } from "@/hooks/useSystemState";
import { mqttService, PAIRING_DISCOVERY_TOPIC, type PairingDiscoveryMessage } from "@/services/MQTTService";
import TelegramBridgeStatus from "@/features/dashboard/TelegramBridgeStatus";

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
  const [didHydrate, setDidHydrate] = useState(false);

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
    setDidHydrate(true);
  }, []);

  useEffect(() => {
    if (!didHydrate) return;
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
    <main className="min-h-screen bg-[#f8fafc] dark:bg-[#020617] transition-colors duration-500 pb-20">
      <PageContainer className="space-y-8">
        {/* Header Section */}
        <header className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900/50 p-8 md:p-10 shadow-2xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-teal-500/10 blur-[80px]" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500 text-white shadow-lg shadow-teal-500/20">
                  <Wifi className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-[0.25em] text-teal-600 dark:text-teal-400">
                  Connectivity Core
                </span>
              </div>
              <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">IoT Hub Management</h1>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Pairing, orchestration, and real-time synchronization bridge.</p>
            </div>

            <div className={`px-6 py-3 rounded-2xl flex items-center gap-3 font-black text-xs tracking-widest ${mqttConnected ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'}`}>
               <Radio className={`h-4 w-4 ${mqttConnected ? 'animate-pulse' : ''}`} />
               {mqttConnected ? 'BROKER CONNECTED' : 'BROKER OFFLINE'}
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
           <HubStat label="Sync State" value={deviceConfig.syncState} icon={<RefreshCw className="h-4 w-4" />} />
           <HubStat label="Heartbeat" value={lastUpdate ? new Date(lastUpdate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "-"} icon={<Activity className="h-4 w-4" />} color="blue" />
           <HubStat label="Queue" value={operationalHealth.queueBacklog} icon={<Binary className="h-4 w-4" />} color="amber" />
           <HubStat label="Attempts" value={reconnectAttempts} icon={<ShieldAlert className="h-4 w-4" />} color="rose" />
        </section>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <div className="rounded-[2.5rem] bg-white dark:bg-slate-900/40 shadow-xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm overflow-hidden">
               <div className="p-8 border-b border-slate-100 dark:border-white/5">
                  <div className="flex items-center gap-3">
                     <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                        <Cpu className="h-5 w-5" />
                     </div>
                     <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">Provisioning</h2>
                  </div>
               </div>
               <div className="p-2">
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
            </div>
          </div>

          <aside className="space-y-8 xl:col-span-4">
            <TelegramBridgeStatus />
            
            <section className="rounded-[2.5rem] bg-white dark:bg-slate-900/40 p-8 shadow-xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
               <div className="flex items-center gap-3 mb-6">
                  <Zap className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">Bridge Diagnostics</h2>
               </div>
               
               <div className="space-y-4">
                  <DiagItem label="Device Target" value={selectedDevice?.name ?? "None"} icon={<Cpu className="h-3.5 w-3.5" />} />
                  <DiagItem label="Broker Mode" value={connection.state} icon={<Wifi className="h-3.5 w-3.5" />} />
                  <DiagItem label="Last Transaction" value={debug.lastAckResult} icon={<Activity className="h-3.5 w-3.5" />} />
                  <DiagItem label="Latency Drift" value={`${operationalHealth.statusDriftMs ?? 0}ms`} icon={<RefreshCw className="h-3.5 w-3.5" />} />
               </div>
            </section>

            <section className="rounded-[2.5rem] bg-white dark:bg-slate-900/40 p-8 shadow-xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
               <div className="flex items-center gap-3 mb-6">
                  <Binary className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">Firmware Manifest</h2>
               </div>
               <div className="space-y-3">
                  <ManifestRow label="Revision" value="v1.0-sim" />
                  <ManifestRow label="Last Sync" value={deviceConfig.lastSyncAt ? new Date(deviceConfig.lastSyncAt).toLocaleDateString() : "Never"} />
                  <ManifestRow label="Sync Code" value={deviceConfig.syncMessage.split(' ')[0]} />
               </div>
            </section>
          </aside>
        </div>
      </PageContainer>
    </main>
  );
}

function HubStat({ label, value, icon, color = "teal" }: { label: string; value: string | number; icon: React.ReactNode; color?: string }) {
   const colors: Record<string, string> = {
      teal: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
      blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
      amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
   };
   return (
      <div className="p-6 rounded-[2rem] bg-white dark:bg-slate-900/40 shadow-xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
         <div className={`p-2.5 rounded-xl w-fit mb-4 ${colors[color]}`}>{icon}</div>
         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
         <p className="text-xl font-black text-slate-800 dark:text-white truncate uppercase">{value}</p>
      </div>
   );
}

function DiagItem({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
   return (
      <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5">
         <div className="flex items-center gap-3">
            <div className="text-slate-400">{icon}</div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
         </div>
         <span className="text-[10px] font-black text-slate-800 dark:text-white uppercase truncate ml-4">{value}</span>
      </div>
   );
}

function ManifestRow({ label, value }: { label: string; value: string }) {
   return (
      <div className="flex justify-between text-xs font-bold py-1">
         <span className="text-slate-500">{label}</span>
         <span className="text-slate-800 dark:text-slate-200">{value}</span>
      </div>
   );
}
