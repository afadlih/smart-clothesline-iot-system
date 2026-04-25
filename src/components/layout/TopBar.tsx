'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Menu,
  Bell,
  Moon,
  Sun,
  ChevronDown,
  User,
  RefreshCcw,
} from 'lucide-react';
import { useSystemState } from '@/hooks/useSystemState';

interface TopBarProps {
  onHamburgerClick: () => void;
}

const SETTINGS_STORAGE_KEY = 'smart-clothesline-settings-v1';

export default function TopBar({ onHamburgerClick }: TopBarProps) {
  const router = useRouter();
  const { isOnline, mode, decision, uiState, lastUpdate } = useSystemState();
  const [isDark, setIsDark] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [hasUnreadNotification, setHasUnreadNotification] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [profileName, setProfileName] = useState('Operator');

  const notificationRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const notifications = useMemo(
    () => [
      {
        id: '1',
        title: 'Sensor stream active',
        detail: 'Cloud MQTT data is connected successfully.',
        time: 'Just now',
      },
      {
        id: '2',
        title: 'Monitoring system online',
        detail: 'Dashboard is receiving periodic updates.',
        time: '1 minute ago',
      },
      {
        id: '3',
        title: 'WhatsApp Notification Roadmap',
        detail: 'WhatsApp channel integration is planned in the cloud enhancement phase.',
        time: 'Planned',
      },
    ],
    [],
  );

  useEffect(() => {
    setMounted(true);

    const isDarkMode =
      localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setIsDark(isDarkMode);

    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

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
      setProfileName('Operator');
    }
  }, []);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (notificationRef.current && !notificationRef.current.contains(target)) {
        setIsNotificationOpen(false);
      }

      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', onClickOutside);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, []);

  const handleThemeToggle = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    localStorage.setItem('theme', newIsDark ? 'dark' : 'light');

    if (newIsDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const goToProfileSettings = () => {
    setIsUserMenuOpen(false);
    router.push('/settings?tab=profile');
  };

  const goToNotificationSettings = () => {
    setIsNotificationOpen(false);
    router.push('/settings?tab=notification');
  };

  const handleResetLocalPreferences = () => {
    const confirmed = window.confirm('Reset local dashboard preferences (profile, notifications, and theme)?');
    if (!confirmed) {
      return;
    }

    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    localStorage.removeItem('theme');

    document.documentElement.classList.remove('dark');
    setIsDark(false);
    setProfileName('Operator');
    setIsUserMenuOpen(false);
    setIsNotificationOpen(false);
    router.push('/settings?tab=profile');
  };

  const profileInitials = profileName
    .split(' ')
    .filter((part) => part)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'OP';

  const lastUpdateSeconds = lastUpdate === null
    ? null
    : Math.max(0, Math.floor((Date.now() - lastUpdate) / 1000));
  const isStale = uiState.stream !== 'STREAMING';
  const liveStatusClass = isOnline
    ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
    : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';

  if (!mounted) {
    return (
      <header className="h-16 border-b border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
    );
  }

  return (
    <header
      className="sticky top-0 z-40 h-16 border-b border-gray-200 bg-white shadow-sm transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex h-full items-center justify-between gap-4 px-4 md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            onClick={onHamburgerClick}
            className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-slate-800 md:hidden"
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5 text-gray-700 dark:text-slate-200" />
          </button>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900 dark:text-slate-100">
              Smart Clothesline Dashboard
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400">Cloud IoT Monitoring</p>
          </div>
          <div className="hidden min-w-0 items-center gap-2 lg:flex">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold ${liveStatusClass}`}
              title={lastUpdateSeconds === null ? 'Last update: -' : `Last update: ${lastUpdateSeconds}s ago`}
            >
              <span
                className={`h-2 w-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'} ${isStale ? 'animate-pulse' : ''}`}
                aria-hidden="true"
              />
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {mode ?? '--'}
            </span>
            <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              {decision.decisionSource}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                decision.scheduleActive
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
              }`}
            >
              Schedule: {decision.scheduleActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => {
                setIsNotificationOpen((prev) => !prev);
                setHasUnreadNotification(false);
              }}
              className="relative rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {hasUnreadNotification && (
                <span className="absolute right-1 top-1 h-2 w-2 animate-pulse rounded-full bg-red-500" />
              )}
            </button>

            {isNotificationOpen && (
              <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-gray-200 bg-white py-2 shadow-lg dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-1 border-b border-gray-100 px-4 pb-2 dark:border-slate-800">
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">Notifications</p>
                </div>
                {notifications.map((item) => (
                  <div
                    key={item.id}
                    className="px-4 py-2 transition-colors hover:bg-gray-50 dark:hover:bg-slate-800"
                  >
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{item.title}</p>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">{item.detail}</p>
                    <p className="mt-1 text-[11px] text-gray-400 dark:text-slate-500">{item.time}</p>
                  </div>
                ))}
                <div className="mt-1 border-t border-gray-100 px-4 pt-2 dark:border-slate-800">
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
            className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Toggle dark mode"
            title={isDark ? 'Light mode' : 'Dark mode'}
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          <div className="relative ml-2 sm:ml-4" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-gray-100 dark:hover:bg-slate-800"
              aria-label="User menu"
            >
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-blue-500 text-sm font-semibold text-white">
                {profileInitials}
              </div>
              <ChevronDown className="hidden h-4 w-4 text-gray-600 dark:text-slate-300 sm:block" />
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 z-50 mt-2 min-w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-slate-800 dark:bg-slate-900">
                <div className="px-4 py-2">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Active Operator</p>
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{profileName}</p>
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
