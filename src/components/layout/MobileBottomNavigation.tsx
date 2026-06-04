'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { 
  Home, 
  Cpu, 
  Bot, 
  BarChart3, 
  MoreHorizontal, 
  Clock, 
  Activity, 
  Bell, 
  Settings 
} from 'lucide-react';

export default function MobileBottomNavigation() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lang = searchParams?.get('lang') === 'id' ? 'id' : 'en';
  const t = (en: string, id: string) => (lang === 'id' ? id : en);

  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close More menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreOpen(false);
      }
    };
    if (isMoreOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isMoreOpen]);

  // Primary navigation items (max 4 + More)
  const primaryItems = [
    {
      label: t('Home', 'Beranda'),
      icon: <Home className="w-5 h-5" />,
      href: '/dashboard',
    },
    {
      label: t('Device', 'Alat'),
      icon: <Cpu className="w-5 h-5" />,
      href: '/iot-hub',
    },
    {
      label: t('Auto', 'Otomatis'),
      icon: <Bot className="w-5 h-5" />,
      href: '/automation',
    },
    {
      label: t('Insights', 'Analisis'),
      icon: <BarChart3 className="w-5 h-5" />,
      href: '/analytics',
    },
  ];

  // Secondary menu items (inside More sheet)
  const secondaryItems = [
    {
      label: t('Sensor Monitor', 'Pemantau Sensor'),
      icon: <Activity className="w-5 h-5 text-teal-500" />,
      href: '/sensor',
    },
    {
      label: t('Schedule', 'Jadwal'),
      icon: <Clock className="w-5 h-5 text-indigo-500" />,
      href: '/schedule',
    },
    {
      label: t('History', 'Riwayat'),
      icon: <Clock className="w-5 h-5 text-amber-500" />,
      href: '/history',
    },
    {
      label: t('Notifications', 'Notifikasi'),
      icon: <Bell className="w-5 h-5 text-rose-500" />,
      href: '/notifications',
    },
    {
      label: t('Settings', 'Pengaturan'),
      icon: <Settings className="w-5 h-5 text-slate-500" />,
      href: '/settings',
    },
  ];

  const isActive = (href: string): boolean => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/';
    }
    return pathname.startsWith(href);
  };

  // Check if any secondary item is active to highlight the "More" button
  const isAnySecondaryActive = secondaryItems.some(item => isActive(item.href));

  return (
    <div ref={moreMenuRef}>
      {/* More Bottom Sheet Menu */}
      {isMoreOpen && (
        <div className="fixed bottom-20 left-4 right-4 z-50 rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-2xl backdrop-blur-md dark:border-white/10 dark:bg-slate-900/95 animate-in slide-in-from-bottom-5 duration-300 md:hidden">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4 px-2">
            {t('More Features', 'Fitur Lainnya')}
          </p>
          <div className="grid grid-cols-3 gap-4">
            {secondaryItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={lang ? `${item.href}?lang=${lang}` : item.href}
                  onClick={() => setIsMoreOpen(false)}
                  className={`
                    flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-300
                    ${
                      active
                        ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold'
                        : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300'
                    }
                  `}
                >
                  <span className="mb-1">{item.icon}</span>
                  <span className="text-[10px] text-center font-semibold leading-tight line-clamp-1">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Bottom Nav Bar */}
      <nav 
        aria-label="Primary mobile navigation"
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200/60 bg-white/95 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/95 md:hidden pb-[env(safe-area-inset-bottom)]"
      >
        <div className="flex h-16 items-center justify-around px-2">
          {primaryItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={lang ? `${item.href}?lang=${lang}` : item.href}
                aria-current={active ? 'page' : undefined}
                onClick={() => setIsMoreOpen(false)}
                className={`
                  flex flex-col items-center justify-center flex-1 h-full py-1 text-center gap-1
                  transition-all duration-300 ease-in-out
                  ${
                    active
                      ? 'text-teal-600 dark:text-teal-400 font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }
                `}
              >
                <span className={`transition-transform duration-300 ${active ? 'scale-110' : ''}`} aria-hidden="true">
                  {item.icon}
                </span>
                <span className="text-[10px] tracking-wide leading-none">{item.label}</span>
              </Link>
            );
          })}

          {/* More Trigger Button */}
          <button
            onClick={() => setIsMoreOpen(!isMoreOpen)}
            className={`
              flex flex-col items-center justify-center flex-1 h-full py-1 text-center gap-1
              transition-all duration-300 ease-in-out
              ${
                isMoreOpen || isAnySecondaryActive
                  ? 'text-teal-600 dark:text-teal-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }
            `}
          >
            <span className={`transition-transform duration-300 ${isMoreOpen ? 'scale-110 rotate-90' : ''}`} aria-hidden="true">
              <MoreHorizontal className="w-5 h-5" />
            </span>
            <span className="text-[10px] tracking-wide leading-none">{t('More', 'Lainnya')}</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
