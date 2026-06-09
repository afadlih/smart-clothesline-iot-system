'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Home,
  Activity,
  Bot,
  Clock,
  Bell,
  Cpu,
  Settings,
  BarChart3,
  ChevronRight,
  X,
  Wind,
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileMenuOpen: boolean;
  onMobileMenuChange: (open: boolean) => void;
}

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  href: string;
}

export default function Sidebar({
  isCollapsed,
  onToggleCollapse,
  isMobileMenuOpen,
  onMobileMenuChange,
}: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lang = searchParams?.get('lang') === 'id' ? 'id' : 'en';
  const t = (en: string, id: string) => (lang === 'id' ? id : en);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Menu items with icons and routes
  const menuItems: MenuItem[] = [
    {
      label: t('Dashboard', 'Dasbor'),
      icon: <Home className="w-5 h-5" />,
      href: '/dashboard',
    },
    {
      label: t('Sensor Monitor', 'Pemantau Sensor'),
      icon: <Activity className="w-5 h-5" />,
      href: '/sensor',
    },
    {
      label: t('Automation', 'Otomatisasi'),
      icon: <Bot className="w-5 h-5" />,
      href: '/automation',
    },
    {
      label: t('History', 'Riwayat'),
      icon: <Clock className="w-5 h-5" />,
      href: '/history',
    },
    {
      label: t('Analytics', 'Analisis'),
      icon: <BarChart3 className="w-5 h-5" />,
      href: '/analytics',
    },
    {
      label: t('Notifications', 'Notifikasi'),
      icon: <Bell className="w-5 h-5" />,
      href: '/notifications',
    },
    {
      label: t('IoT Hub', 'IoT Hub'),
      icon: <Cpu className="w-5 h-5" />,
      href: '/iot-hub',
    },
    {
      label: t('Settings', 'Pengaturan'),
      icon: <Settings className="w-5 h-5" />,
      href: '/settings',
    },
  ];

  // Check if a route is active
  const isActive = (href: string): boolean => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Desktop Sidebar - Responsive with push behavior */}
      <aside
        className={`
          hidden md:flex md:flex-col
          border-r border-white/10 bg-slate-950 text-white
          sticky top-0 h-screen
          transition-all duration-300 ease-in-out
          z-40
          ${isCollapsed ? 'w-16' : 'w-64'}
          overflow-hidden
          backdrop-blur-xl
        `}
      >
        {/* Sidebar Header with Premium Branding */}
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-6">
          {!isCollapsed && (
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md border border-white/20 shadow-lg group">
                <Wind className="h-5 w-5 text-teal-400 group-hover:scale-110 transition-transform duration-300" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold truncate text-white tracking-tight">Smart Clothesline</span>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="w-full flex justify-center">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md border border-white/20 shadow-lg">
                <Wind className="h-5 w-5 text-teal-400" />
              </div>
            </div>
          )}
        </div>

        {/* Menu Items */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-6 custom-scrollbar">
          {menuItems.map((item) => {
            const active = isActive(item.href);
            return (
              <div key={item.href} className="group relative">
                <Link
                  href={lang ? `${item.href}?lang=${lang}` : item.href}
                  onClick={() => onMobileMenuChange(false)}
                  className={`
                    flex items-center rounded-2xl
                    transition-all duration-300 ease-in-out
                    ${
                      active
                        ? 'bg-teal-500/20 text-teal-300 ring-1 ring-teal-500/30 shadow-[0_0_15px_rgba(20,184,166,0.15)]'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }
                    ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'}
                  `}
                  onMouseEnter={() => setHoveredItem(item.href)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  {/* Icon */}
                  <span className={`flex-shrink-0 flex items-center justify-center transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
                    {item.icon}
                  </span>

                  {/* Label */}
                  {!isCollapsed && (
                    <span className={`text-sm font-semibold truncate ${active ? 'text-white' : ''}`}>{item.label}</span>
                  )}

                  {/* Active Indicator Dot */}
                  {!isCollapsed && active && (
                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
                  )}
                </Link>

                {/* Tooltip for collapsed state */}
                {isCollapsed && hoveredItem === item.href && (
                  <div
                    className="
                      absolute left-full ml-4 top-1/2 -translate-y-1/2
                      bg-slate-800 text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-xl
                      whitespace-nowrap pointer-events-none
                      z-50 shadow-2xl border border-white/10 backdrop-blur-md
                    "
                  >
                    {item.label}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Bottom Section - Version Info */}

        {/* Collapse Toggle Button - Desktop only */}
        <div className="border-t border-white/5 px-3 py-4">
          <button
            onClick={onToggleCollapse}
            className={`
              w-full flex items-center justify-center p-3 rounded-2xl
              text-slate-400 hover:bg-white/5 hover:text-white
              transition-all duration-300 ease-in-out
            `}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronRight
              className={`w-5 h-5 transition-transform duration-300 ${
                isCollapsed ? 'rotate-0' : 'rotate-180'
              }`}
            />
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar - Drawer overlay */}
      <aside
        className={`
          hidden
          fixed top-0 bottom-0 left-0
          flex flex-col
          border-r border-white/10 bg-slate-950/95 text-white
          w-[280px]
          z-50
          backdrop-blur-xl
          transform transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1)
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          overflow-hidden shadow-[20px_0_50px_rgba(0,0,0,0.3)]
        `}
      >
        {/* Mobile menu header */}
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md border border-white/20 shadow-lg">
              <Wind className="h-5 w-5 text-teal-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white tracking-tight">Smart Clothesline</span>
            </div>
          </div>
          <button
            onClick={() => onMobileMenuChange(false)}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all duration-300 group"
            aria-label="Close menu"
          >
            <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>

        {/* Mobile menu items */}
        <nav className="flex-1 overflow-y-auto px-4 py-6">
          <div className="space-y-2 pb-6">
            {menuItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={lang ? `${item.href}?lang=${lang}` : item.href}
                  onClick={() => onMobileMenuChange(false)}
                  className={`
                    flex items-center gap-4 rounded-2xl px-4 py-3.5
                    transition-all duration-300 ease-in-out
                    ${
                      active
                        ? 'bg-teal-500/20 text-teal-300 ring-1 ring-teal-500/30 shadow-lg'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }
                  `}
                >
                  <span className={`flex-shrink-0 transition-transform duration-300 ${active ? 'scale-110' : ''}`}>
                    {item.icon}
                  </span>
                  <span className="text-sm font-semibold">{item.label}</span>
                  {active && (
                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
        
        {/* Mobile footer */}
        <div className="p-6 border-t border-white/5">
           <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-xs font-bold text-white shadow-lg">
                SC
              </div>
              <div>
                <p className="text-xs font-bold text-white">Smart Clothesline</p>
              </div>
           </div>
        </div>
      </aside>
    </>
  );
}

