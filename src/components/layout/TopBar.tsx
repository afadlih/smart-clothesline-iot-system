"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Menu,
  Bell,
  Moon,
  Sun,
  ChevronDown,
  User,
  RefreshCcw,
  Cpu,
  Clock,
  Monitor,
  Shield,
  LogOut,
} from "lucide-react";
import StatusBadge from "@/components/layout/StatusBadge";
import { useSystemState } from "@/hooks/useSystemState";
import { useNotificationEngine } from "@/hooks/useNotificationEngine";
import { useThemeStore } from "@/stores/themeStore";
import { useAuth } from "@/hooks/useAuth";

interface TopBarProps {
  onHamburgerClick: () => void;
  isMobileMenuOpen?: boolean;
}

const SETTINGS_STORAGE_KEY = "smart-clothesline-settings-v1";

export default function TopBar({ onHamburgerClick, isMobileMenuOpen = false }: TopBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = searchParams?.get("lang") === "id" ? "id" : "en";
  const t = (en: string, id: string) => (lang === "id" ? id : en);
  const { runtime } = useSystemState();
  const {
    events: notificationEvents,
    unreadCount,
    markAllRead,
  } = useNotificationEngine();
  const [isDark, setIsDark] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [profileName, setProfileName] = useState("Operator");
  const { user, signOutUser, loading: authLoading } = useAuth();

  const notificationRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const notifications = notificationEvents;
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);

  useEffect(() => {
    setMounted(true);
    setIsDark(document.documentElement.classList.contains("dark"));

    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as { profileName?: string };
      if (parsed.profileName && parsed.profileName.trim()) {
        setProfileName(parsed.profileName.trim());
      }
    } catch {
      setProfileName("Operator");
    }
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    const resolvedName = user.displayName || user.email || "Operator";
    setProfileName(resolvedName);
  }, [user]);

  useEffect(() => {
    if (!mounted) return;
    const resolvedDark =
      theme === "dark" ||
      (theme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    setIsDark(resolvedDark);
  }, [mounted, theme]);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        notificationRef.current &&
        !notificationRef.current.contains(target)
      ) {
        setIsNotificationOpen(false);
      }

      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", onClickOutside);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, []);



  const handleThemeToggle = () => {
    const newIsDark = !isDark;
    setTheme(newIsDark ? "dark" : "light");
  };

  const goToProfileSettings = () => {
    setIsUserMenuOpen(false);
    router.push(`/settings?tab=profile${lang === "id" ? "&lang=id" : ""}`);
  };

  const goToNotificationSettings = () => {
    setIsNotificationOpen(false);
    router.push(`/notifications${lang === "id" ? "?lang=id" : ""}`);
  };

  const handleResetLocalPreferences = () => {
    const confirmed = window.confirm(
      t(
        "Reset local dashboard preferences (profile, notifications, and theme)?",
        "Atur ulang preferensi dasbor lokal (profil, notifikasi, dan tema)?"
      )
    );
    if (!confirmed) {
      return;
    }

    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    setTheme("system");
    setProfileName("Operator");
    setIsUserMenuOpen(false);
    setIsNotificationOpen(false);
    router.push(`/settings?tab=profile${lang === "id" ? "&lang=id" : ""}`);
  };

  const clearSmartClothesLineStorage = () => {
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      if (
        key.startsWith("smart-clothesline-") ||
        key === "isLogin" ||
        key === "user"
      ) {
        keysToRemove.push(key);
      }

      keysToRemove.forEach((key) => {
        localStorage.removeItem(key);
      })
    }
  }

  const handleSignOut = async () => {
    clearSmartClothesLineStorage();
    setIsUserMenuOpen(false);
    await signOutUser();
    router.replace(`/auth/login${lang === "id" ? "?lang=id" : ""}`);
  };

  const profileInitials =
    profileName
      .split(" ")
      .filter((part) => part)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "OP";

  const deviceStatus =
    runtime.deviceConnectivity === "ONLINE"
      ? t("Online", "Online")
      : runtime.deviceConnectivity === "DELAYED"
        ? t("Delayed", "Terlambat")
        : t("Offline", "Offline");

  const modeLabel =
    runtime.actualDeviceMode === "MANUAL"
      ? t("Manual", "Manual")
      : runtime.actualDeviceMode === "AUTO"
        ? t("Auto", "Otomatis")
        : t("Unknown", "Tidak Diketahui");

  const systemState =
    runtime.decisionSource === "MANUAL"
      ? t("Manual Override", "Kontrol Manual")
      : runtime.decisionSource === "SAFETY"
        ? (runtime.safetyLabel === "RAIN ALERT"
            ? t("Rain Alert", "Peringatan Hujan")
            : runtime.safetyLabel === "LOW LIGHT"
              ? t("Low Light", "Kurang Cahaya")
              : runtime.safetyLabel === "OVERRIDE"
                ? t("Manual Override", "Kontrol Manual")
                : runtime.safetyLabel)
        : t("Monitoring", "Memantau");

  const deviceDotClass =
    runtime.deviceConnectivity === "ONLINE"
      ? "bg-emerald-500"
      : runtime.deviceConnectivity === "DELAYED"
        ? "bg-amber-500"
        : "bg-red-500";
  const deviceValueClass =
    runtime.deviceConnectivity === "ONLINE"
      ? "text-emerald-700 dark:text-emerald-300"
      : runtime.deviceConnectivity === "DELAYED"
        ? "text-amber-700 dark:text-amber-300"
        : "text-red-700 dark:text-red-300";
  const modeDotClass = "bg-indigo-500";
  const modeValueClass = "text-indigo-700 dark:text-indigo-300";
  const systemDotClass =
    runtime.decisionSource === "MANUAL"
      ? "bg-slate-500"
      : runtime.decisionSource === "SAFETY"
        ? "bg-rose-500"
        : "bg-emerald-500";
  const systemValueClass =
    runtime.decisionSource === "MANUAL"
      ? "text-slate-700 dark:text-slate-300"
      : runtime.decisionSource === "SAFETY"
        ? "text-rose-700 dark:text-rose-300"
        : "text-emerald-700 dark:text-emerald-300";

  if (!mounted) {
    return (
      <header className="h-16 border-b border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
    );
  }

  return (
    <header className={`sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl transition-all duration-300 border-b border-slate-200/60 dark:border-white/10 ${isMobileMenuOpen ? 'md:hidden blur-sm' : ''
      }`}>
      <div className="flex items-center justify-between gap-2 md:gap-4 px-4 py-3 md:px-6 lg:px-8 transition-colors duration-300">
        {/* Left Section */}
        <div className="flex flex-shrink-0 items-center gap-1 sm:gap-2">
          <button
            onClick={onHamburgerClick}
            className="rounded-xl p-2.5 transition-all hover:bg-slate-100 dark:hover:bg-white/5 md:hidden"
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5 text-slate-600 dark:text-slate-300" />
          </button>

          <div className="flex min-w-0 items-center gap-3">
            <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600 shadow-sm dark:bg-teal-500/10 dark:text-teal-400 border border-teal-100 dark:border-teal-500/20">
              <Cpu className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-800 dark:text-white tracking-tight">
                Smart Clothesline
              </p>
              <p className="hidden md:block text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                {t("Operational Workspace", "Ruang Kerja Operasional")}
              </p>
            </div>
          </div>
        </div>

        {/* Center Section - Refined Status Badges */}
        <div className="hidden flex-1 items-center justify-center gap-8 lg:flex">
          <div className="flex items-center gap-6 px-6 py-1.5 rounded-2xl bg-slate-50/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5">
            <StatusBadge
              icon={<Monitor className="h-4 w-4" aria-hidden="true" />}
              label={t("Device", "Alat")}
              value={deviceStatus}
              valueClass={deviceValueClass}
              dotClass={deviceDotClass}
              dotPulseClass={runtime.streamState === "STREAMING" ? "animate-pulse" : ""}
              iconBgClass="bg-white dark:bg-slate-800 shadow-sm"
              iconTextClass="text-slate-500 dark:text-slate-300"
              title={
                runtime.freshnessSeconds === null
                  ? t("Last update: -", "Terakhir update: -")
                  : t(
                      `Last update: ${runtime.freshnessSeconds}s ago`,
                      `Terakhir update: ${runtime.freshnessSeconds} detik lalu`
                    )
              }
            />
            <div className="h-6 w-px bg-slate-200 dark:bg-white/10" />

            <StatusBadge
              icon={<Clock className="h-4 w-4" aria-hidden="true" />}
              label={t("Mode", "Mode")}
              value={modeLabel}
              valueClass={modeValueClass}
              dotClass={modeDotClass}
              iconBgClass="bg-teal-50 dark:bg-teal-500/10 shadow-sm"
              iconTextClass="text-teal-600 dark:text-teal-400"
            />
            <div className="h-6 w-px bg-slate-200 dark:bg-white/10" />

            <StatusBadge
              icon={<Shield className="h-4 w-4" aria-hidden="true" />}
              label={t("Guard", "Keamanan")}
              value={systemState}
              valueClass={systemValueClass}
              dotClass={systemDotClass}
              iconBgClass="bg-emerald-50 dark:bg-emerald-500/10 shadow-sm"
              iconTextClass="text-emerald-600 dark:text-emerald-400"
              title={t("Automated safety status", "Status keamanan otomatis")}
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => {
                setIsNotificationOpen((prev) => !prev);
                markAllRead();
              }}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/60 text-slate-600 transition-all hover:bg-slate-50 hover:border-slate-300 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
              aria-label={t("Notifications", "Notifikasi")}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
              )}
            </button>

            {isNotificationOpen && (
              <div className="fixed bottom-auto top-20 left-1/2 -translate-x-1/2 sm:absolute sm:top-full sm:bottom-auto sm:left-auto sm:right-0 sm:translate-x-0 z-50 mt-4 w-[calc(100vw-2rem)] sm:w-80 rounded-2xl border border-slate-200 bg-white/95 py-2 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95 animate-in fade-in zoom-in-95 duration-200">
                <div className="mb-1 border-b border-slate-100 px-5 pb-3 pt-2 dark:border-white/5">
                  <p className="text-sm font-bold text-slate-800 dark:text-white">
                    {t("Notifications", "Notifikasi")}
                  </p>
                </div>
                <div className="max-h-80 overflow-y-auto px-2">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <p className="text-xs font-medium text-slate-400">{t("No operational events yet.", "Belum ada kejadian operasional.")}</p>
                    </div>
                  ) : (
                    notifications.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
                      >
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                          {item.title}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          {item.description}
                        </p>
                        <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    ))
                  )}
                </div>
                <div className="border-t border-slate-100 mt-2 px-4 py-2 dark:border-white/5">
                  <button
                    type="button"
                    onClick={goToNotificationSettings}
                    className="w-full rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-600 transition-all hover:bg-slate-100 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                  >
                    {t("Manage Settings", "Atur Setelan")}
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleThemeToggle}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/60 text-slate-600 transition-all hover:bg-slate-50 hover:border-slate-300 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
            aria-label="Toggle dark mode"
            title={isDark ? t("Light mode", "Mode terang") : t("Dark mode", "Mode gelap")}
          >
            {isDark ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>

          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="group flex items-center gap-2 rounded-xl border border-slate-200/60 bg-white/50 p-1.5 transition-all hover:bg-white hover:border-slate-300 dark:border-white/10 dark:bg-slate-900/50 dark:hover:bg-slate-800 shadow-sm"
              aria-label="User menu"
            >
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 text-xs font-bold text-white shadow-md transition-transform group-hover:scale-105">
                {profileInitials}
              </div>
              <ChevronDown className={`hidden h-4 w-4 text-slate-400 transition-transform duration-300 sm:block ${isUserMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 z-50 mt-4 min-w-[200px] rounded-2xl border border-slate-200 bg-white/95 py-2 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95 animate-in fade-in zoom-in-95 duration-200">
                <div className="px-5 py-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-teal-600 dark:text-teal-400 leading-none mb-1.5">
                    {t("Operator", "Operator")}
                  </p>
                  <p className="truncate text-sm font-bold text-slate-800 dark:text-white">
                    {profileName}
                  </p>
                </div>
                <div className="mx-2 my-1.5 h-px bg-slate-100 dark:bg-white/5" />
                <button
                  type="button"
                  onClick={goToProfileSettings}
                  className="flex w-full items-center gap-3 px-5 py-2.5 text-left text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5"
                >
                  <User className="h-4 w-4" />
                  {t("Account Profile", "Profil Akun")}
                </button>
                <button
                  type="button"
                  onClick={handleResetLocalPreferences}
                  className="flex w-full items-center gap-3 px-5 py-2.5 text-left text-sm font-semibold text-amber-600 transition-colors hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20"
                >
                  <RefreshCcw className="h-4 w-4" />
                  {t("Reset UI Settings", "Atur Ulang UI")}
                </button>
                <div className="mx-2 my-1.5 h-px bg-slate-100 dark:bg-white/5" />
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={authLoading}
                  className="flex w-full items-center gap-3 px-5 py-2.5 text-left text-sm font-bold text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-rose-400 dark:hover:bg-rose-900/20"
                >
                  <LogOut className="h-4 w-4" />
                  {t("Sign Out", "Keluar")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

