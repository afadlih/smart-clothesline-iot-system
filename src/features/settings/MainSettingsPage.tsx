"use client";

import { useEffect, useState } from "react";
import { Settings, User, Briefcase, Globe, Save, CheckCircle2 } from "lucide-react";
import PageContainer from "@/components/layout/PageContainer";
import { useThemeStore } from "@/stores/themeStore";

const SETTINGS_STORAGE_KEY = "smart-clothesline-settings-v1";

export default function SettingsPage({ lang = "en" }: { lang?: "en" | "id" }) {
  const t = (en: string, id: string) => (lang === "id" ? id : en);

  const [profileName, setProfileName] = useState("Operator");
  const [workspaceName, setWorkspaceName] = useState("Main Workspace");
  const [timezone, setTimezone] = useState("Asia/Jakarta");
  const [isSaved, setIsSaved] = useState(false);
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { profileName?: string; workspaceName?: string; timezone?: string };
        if (parsed.profileName) setProfileName(parsed.profileName);
        if (parsed.workspaceName) setWorkspaceName(parsed.workspaceName);
        if (parsed.timezone) setTimezone(parsed.timezone);
      }
    } catch {
      // noop
    }
  }, []);

  const onSave = () => {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      const prev = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ ...prev, profileName, workspaceName, timezone }));
    } catch {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ profileName, workspaceName, timezone }));
    }
    setIsSaved(true);
    window.setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <main className="min-h-screen bg-[#f8fafc] dark:bg-[#020617] transition-colors duration-500 pb-20">
      <PageContainer className="space-y-8">
        {/* Header Section */}
        <header className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900/50 p-8 md:p-10 shadow-2xl shadow-teal-500/5 border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-teal-500/10 blur-[80px]" />
          <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-emerald-500/5 blur-[80px]" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-655 text-white shadow-lg shadow-teal-600/20">
                  <Settings className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-[0.25em] text-teal-600 dark:text-teal-400">
                  {t("System Preferences", "Preferensi Sistem")}
                </span>
              </div>
              <h1 className="text-5xl md:text-6xl font-black text-slate-800 dark:text-white tracking-tighter">{t("User Settings", "Pengaturan Pengguna")}</h1>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{t("Configure your profile, workspace, and interface behavior.", "Atur profil, ruang kerja, dan tampilan antarmuka Anda.")}</p>
            </div>

            <button 
              onClick={onSave}
              className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-xs tracking-widest transition-all active:scale-95 shadow-xl ${isSaved ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-slate-900 dark:bg-teal-600 text-white shadow-teal-600/20 hover:opacity-90'}`}
            >
              {isSaved ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  {t("SAVED SUCCESS", "BERHASIL DISIMPAN")}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {t("SAVE CHANGES", "SIMPAN PERUBAHAN")}
                </>
              )}
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Profile Settings */}
          <div className="rounded-[2.5rem] bg-white dark:bg-slate-900/40 p-10 shadow-xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-10">
               <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                  <User className="h-5 w-5" />
               </div>
               <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">{t("Identity Profile", "Profil Identitas")}</h2>
            </div>
            
            <div className="space-y-8">
               <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{t("Profile Name", "Nama Profil")}</label>
                  <div className="relative">
                     <input
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="w-full rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 p-5 text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-1 ring-teal-500/50 transition-all"
                        placeholder={t("Your name", "Nama Anda")}
                     />
                  </div>
               </div>
               <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{t("Workspace Alias", "Alias Ruang Kerja")}</label>
                  <div className="relative">
                     <Briefcase className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                     <input
                        type="text"
                        value={workspaceName}
                        onChange={(e) => setWorkspaceName(e.target.value)}
                        className="w-full rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 p-5 pl-14 text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-1 ring-teal-500/50 transition-all"
                        placeholder={t("Workspace name", "Nama Ruang Kerja")}
                     />
                  </div>
               </div>
            </div>
          </div>

          {/* Regional & Appearance */}
          <div className="rounded-[2.5rem] bg-white dark:bg-slate-900/40 p-10 shadow-xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-10">
               <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                  <Globe className="h-5 w-5" />
               </div>
               <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">{t("Localization & Theme", "Lokalisasi & Tema")}</h2>
            </div>

            <div className="space-y-8">
               <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{t("System Timezone", "Zona Waktu Sistem")}</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 p-5 text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-1 ring-teal-500/50 transition-all appearance-none"
                  >
                    <option value="Asia/Jakarta">Jakarta (GMT+7)</option>
                    <option value="Asia/Singapore">Singapore (GMT+8)</option>
                    <option value="UTC">UTC Standard</option>
                  </select>
               </div>
               <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{t("Interface Mode", "Mode Antarmuka")}</label>
                  <div className="grid grid-cols-3 gap-4">
                     <ThemeButton active={theme === 'light'} label={t("Light", "Terang")} onClick={() => setTheme('light')} />
                     <ThemeButton active={theme === 'dark'} label={t("Dark", "Gelap")} onClick={() => setTheme('dark')} />
                     <ThemeButton active={theme === 'system'} label={t("Auto", "Otomatis")} onClick={() => setTheme('system')} />
                  </div>
               </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2.5rem] bg-slate-900 p-12 text-white relative overflow-hidden shadow-2xl">
           <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-teal-500/20 blur-[100px]" />
           <div className="relative z-10 max-w-2xl">
              <h2 className="text-3xl font-black mb-6">{t("Configuration Insight", "Wawasan Konfigurasi")}</h2>
              <p className="text-slate-400 font-medium leading-relaxed mb-10 text-lg">
                 {t(
                   "These settings are persisted locally in your browser to maintain your personalized operational environment. Global system rules are managed via the Automation and IoT Hub modules.",
                   "Pengaturan ini disimpan secara lokal di browser Anda untuk mempertahankan lingkungan operasional pribadi Anda. Aturan sistem global dikelola melalui modul Otomatisasi dan IoT Hub."
                 )}
              </p>
              <div className="flex flex-wrap gap-6">
                 <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/5 border border-white/10">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-300">{t("Local Cache Active", "Cache Lokal Aktif")}</span>
                 </div>
                 <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/5 border border-white/10">
                    <div className="h-2.5 w-2.5 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.5)]" />
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-300">{t("Sync Version 1.0", "Sinkronisasi Versi 1.0")}</span>
                 </div>
              </div>
           </div>
        </section>
      </PageContainer>
    </main>
  );
}

function ThemeButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`p-6 rounded-2xl border flex flex-col items-center gap-3 transition-all ${active ? 'bg-teal-500 border-teal-600 text-white shadow-lg shadow-teal-500/20 scale-[1.02]' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'}`}
    >
       <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );
}
