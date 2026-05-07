"use client";

import { useEffect, useState } from "react";
import PageContainer from "@/components/layout/PageContainer";

const SETTINGS_STORAGE_KEY = "smart-clothesline-settings-v1";

export default function SettingsPage() {
  const [profileName, setProfileName] = useState("Operator");
  const [workspaceName, setWorkspaceName] = useState("Main Workspace");
  const [timezone, setTimezone] = useState("Asia/Jakarta");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [savedLabel, setSavedLabel] = useState("Save Preferences");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { profileName?: string };
        if (parsed.profileName) setProfileName(parsed.profileName);
      }
      const localTheme = localStorage.getItem("theme");
      if (localTheme === "dark" || localTheme === "light") setTheme(localTheme);
    } catch {
      // noop
    }
  }, []);

  const onSave = () => {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      const prev = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ ...prev, profileName }));
    } catch {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ profileName }));
    }
    localStorage.setItem("theme", theme);
    if (theme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    setSavedLabel("Saved");
    window.setTimeout(() => setSavedLabel("Save Preferences"), 1200);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-900 dark:to-slate-950">
      <PageContainer className="space-y-5">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Settings</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Profile, workspace preferences, appearance, and account options.</p>
        </header>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Profile</h2>
            <div className="mt-3 space-y-3">
              <label className="block text-xs text-slate-500">Profile Name<input value={profileName} onChange={(e) => setProfileName(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" /></label>
              <label className="block text-xs text-slate-500">Workspace Name<input value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" /></label>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Workspace Preferences</h2>
            <div className="mt-3 space-y-3">
              <label className="block text-xs text-slate-500">Timezone
                <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">
                  <option value="Asia/Jakarta">Asia/Jakarta</option>
                  <option value="UTC">UTC</option>
                  <option value="Asia/Singapore">Asia/Singapore</option>
                </select>
              </label>
              <label className="block text-xs text-slate-500">Theme
                <select value={theme} onChange={(e) => setTheme(e.target.value as "light" | "dark")} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </label>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Account Preferences</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">This workspace keeps local profile and display preferences for each operator session.</p>
          <button onClick={onSave} className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
            {savedLabel}
          </button>
        </section>
      </PageContainer>
    </main>
  );
}
