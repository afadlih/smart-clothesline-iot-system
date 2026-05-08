"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Menu,
  Bell,
  Gift,
  Moon,
  Sun,
  ChevronDown,
  User,
  RefreshCcw,
  Cpu,
  ShieldCheck,
  Clock,
} from "lucide-react";
import StatusBadge from "@/components/layout/StatusBadge";
import { useSystemState } from "@/hooks/useSystemState";
import { useNotificationEngine } from "@/hooks/useNotificationEngine";
import { useThemeStore } from "@/stores/themeStore";

interface TopBarProps {
  onHamburgerClick: () => void;
  isMobileMenuOpen?: boolean;
}

const SETTINGS_STORAGE_KEY = "smart-clothesline-settings-v1";

export default function TopBar({ onHamburgerClick, isMobileMenuOpen = false }: TopBarProps) {
  const router = useRouter();
  const { mode, decision, uiState, lastUpdate } = useSystemState();
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
    router.push("/settings?tab=profile");
  };

  const goToNotificationSettings = () => {
    setIsNotificationOpen(false);
    router.push("/notifications");
  };

  const handleResetLocalPreferences = () => {
    const confirmed = window.confirm(
      "Reset local dashboard preferences (profile, notifications, and theme)?",
    );
    if (!confirmed) {
      return;
    }

    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    setTheme("system");
    setProfileName("Operator");
    setIsUserMenuOpen(false);
    setIsNotificationOpen(false);
    router.push("/settings?tab=profile");
  };

  const profileInitials =
    profileName
      .split(" ")
      .filter((part) => part)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "OP";

  const lastUpdateSeconds =
    lastUpdate === null
      ? null
      : Math.max(0, Math.floor((Date.now() - lastUpdate) / 1000));
  const deviceStatus =
    lastUpdateSeconds === null
      ? "Offline"
      : lastUpdateSeconds > 30
        ? "Offline"
        : lastUpdateSeconds > 15
          ? "Delayed"
          : "Online";
  const streamStatus =
    uiState.stream === "STREAMING"
      ? "Streaming"
      : uiState.stream === "NO_DATA"
        ? "Waiting Data"
        : "Idle";
  const modeLabel = mode === "MANUAL" ? "Manual" : "Auto";
  const systemState =
    decision.decisionSource === "MANUAL"
      ? "Manual Override"
      : decision.decisionSource === "SAFETY"
        ? decision.reason.toLowerCase().includes("rain")
          ? "Rain Detected"
          : "Auto Closed"
        : "Safe";
  const deviceDotClass =
    deviceStatus === "Online"
      ? "bg-emerald-500"
      : deviceStatus === "Delayed"
        ? "bg-amber-500"
        : "bg-red-500";
  const deviceValueClass =
    deviceStatus === "Online"
      ? "text-emerald-700 dark:text-emerald-300"
      : deviceStatus === "Delayed"
        ? "text-amber-700 dark:text-amber-300"
        : "text-red-700 dark:text-red-300";
  const modeDotClass = "bg-indigo-500";
  const modeValueClass = "text-indigo-700 dark:text-indigo-300";
  const systemDotClass =
    systemState === "Safe"
      ? "bg-emerald-500"
      : systemState === "Manual Override"
        ? "bg-slate-500"
        : "bg-red-500";
  const systemValueClass =
    systemState === "Safe"
      ? "text-emerald-700 dark:text-emerald-300"
      : systemState === "Manual Override"
        ? "text-slate-700 dark:text-slate-300"
        : "text-red-700 dark:text-red-300";

  if (!mounted) {
    return (
      <header className="h-16 border-b border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
    );
  }

  return (
    <header className={`sticky top-0 z-40 bg-[#eff0f3] dark:bg-[#0a1123] px-2 py-3 md:px-4 lg:px-6 transition-all duration-300 ${
      isMobileMenuOpen ? 'md:hidden blur-sm' : ''
    }`}>
      <div className="flex items-center justify-between gap-2 md:gap-4 rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 md:px-4 shadow-sm backdrop-blur transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900/90">
        {/* Left Section */}
        <div className="flex flex-shrink-0 items-center gap-1 sm:gap-2">
          <button
            onClick={onHamburgerClick}
            className="rounded-lg p-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5 text-gray-700 dark:text-slate-200" />
          </button>

          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shadow-sm dark:bg-indigo-500/10 dark:text-indigo-200">
              <Gift className="h-4 w-4 md:h-5 md:w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs md:text-sm font-semibold text-gray-900 dark:text-slate-100">
                Smart Clothesline Platform
              </p>
              <p className="hidden md:block text-xs text-gray-500 dark:text-slate-400">
                Operational Monitoring Workspace
              </p>
            </div>
          </div>
        </div>

        {/* Center Section */}
        <div className="hidden flex-1 items-center justify-center gap-16 lg:flex">
          <StatusBadge
            icon={<Cpu className="h-5 w-5" aria-hidden="true" />}
            label="Device"
            value={deviceStatus}
            valueClass={deviceValueClass}
            dotClass={deviceDotClass}
            dotPulseClass={streamStatus === "Streaming" ? "animate-pulse" : ""}
            iconBgClass="bg-slate-100 dark:bg-slate-800"
            iconTextClass="text-slate-600 dark:text-slate-200"
            title={
              lastUpdateSeconds === null
                ? "Last update: -"
                : `Last update: ${lastUpdateSeconds}s ago`
            }
          />
          <div className="h-8 border-l border-slate-200 dark:border-slate-700" />

          <StatusBadge
            icon={<Clock className="h-5 w-5" aria-hidden="true" />}
            label="Mode"
            value={modeLabel}
            valueClass={modeValueClass}
            dotClass={modeDotClass}
            iconBgClass="bg-indigo-50 dark:bg-indigo-500/15"
            iconTextClass="text-indigo-600 dark:text-indigo-200"
          />
          <div className="h-8 border-l border-slate-200 dark:border-slate-700" />

          <StatusBadge
            icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}
            label="System"
            value={systemState}
            valueClass={systemValueClass}
            dotClass={systemDotClass}
            iconBgClass="bg-emerald-50 dark:bg-emerald-500/15"
            iconTextClass="text-emerald-600 dark:text-emerald-200"
          />
        </div>

        {/* Right Section */}
        <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => {
                setIsNotificationOpen((prev) => !prev);
                markAllRead();
              }}
              className="relative flex h-9 w-9 items-center justify-center rounded-full border-slate-200 text-gray-600 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 h-2 w-2 animate-pulse rounded-full bg-red-500" />
              )}
            </button>

            {isNotificationOpen && (
              <div className="fixed bottom-auto top-20 left-1/2 -translate-x-1/2 sm:absolute sm:top-auto sm:bottom-auto sm:left-auto sm:right-0 sm:translate-x-0 z-50 mt-2 w-[calc(100vw-2rem)] sm:w-80 rounded-xl border border-gray-200 bg-white py-2 shadow-lg dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-1 border-b border-gray-100 px-4 pb-2 dark:border-slate-800">
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                    Notifications
                  </p>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-4 text-xs text-slate-500 dark:text-slate-400">
                      No operational events yet.
                    </div>
                  ) : (
                    notifications.map((item) => (
                      <div
                        key={item.id}
                        className="px-4 py-2 transition-colors hover:bg-gray-50 dark:hover:bg-slate-800"
                      >
                        <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                          {item.title}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">
                          {item.description}
                        </p>
                        <p className="mt-1 text-[11px] text-gray-400 dark:text-slate-500">
                          {new Date(item.timestamp).toLocaleString("en-US")}
                        </p>
                      </div>
                    ))
                  )}
                </div>
                <div className="border-t border-gray-100 px-4 pt-2 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={goToNotificationSettings}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Open Notification Settings
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleThemeToggle}
            className="flex h-9 w-9 items-center justify-center rounded-full border-slate-200 text-gray-600 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Toggle dark mode"
            title={isDark ? "Light mode" : "Dark mode"}
          >
            {isDark ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>

          <div className="relative ml-2 sm:ml-4" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 rounded-full border-slate-200 bg-white/90 p-1 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:bg-slate-800"
              aria-label="User menu"
            >
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 text-sm font-semibold text-white">
                {profileInitials}
              </div>
              <ChevronDown className="hidden h-4 w-4 text-gray-600 dark:text-slate-300 sm:block" />
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 z-50 mt-2 min-w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-slate-800 dark:bg-slate-900">
                <div className="px-4 py-2">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Active Operator
                  </p>
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {profileName}
                  </p>
                </div>
                <hr className="my-1 border-gray-200 dark:border-slate-800" />
                <button
                  type="button"
                  onClick={goToProfileSettings}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <User className="h-4 w-4" />
                  Profile Settings
                </button>
                <hr className="my-1 border-gray-200 dark:border-slate-800" />
                <button
                  type="button"
                  onClick={handleResetLocalPreferences}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-amber-700 transition-colors hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-900/20"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Reset Local Preferences
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
