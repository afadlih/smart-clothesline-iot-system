'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Activity,
  Clock,
  Calendar,
  Settings,
  BarChart3,
  ChevronRight,
  X,
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

/**
 * Sidebar Component
 * 
 * Responsive sidebar navigation with collapsible menu.
 * - Desktop: Pushes main content, toggle collapse/expand
 * - Mobile: Drawer overlay with backdrop blur
 * - Persistent state via localStorage
 * 
 * Features:
 * - Icon-based menu items with tooltips when collapsed
 * - Active route highlighting with green accent
 * - Smooth animations (300ms transitions)
 * - Mobile drawer with close button
 */
export default function Sidebar({
  isCollapsed,
  onToggleCollapse,
  isMobileMenuOpen,
  onMobileMenuChange,
}: SidebarProps) {
  const pathname = usePathname();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Menu items with icons and routes
  const menuItems: MenuItem[] = [
    {
      label: 'Dashboard',
      icon: <Home className="w-5 h-5" />,
      href: '/dashboard',
    },
    {
      label: 'Sensor Monitor',
      icon: <Activity className="w-5 h-5" />,
      href: '/sensor',
    },
    {
      label: 'History',
      icon: <Clock className="w-5 h-5" />,
      href: '/history',
    },
    {
      label: 'Schedule',
      icon: <Calendar className="w-5 h-5" />,
      href: '/schedule',
    },
    {
      label: 'Settings',
      icon: <Settings className="w-5 h-5" />,
      href: '/settings',
    },
    {
      label: 'Analytics',
      icon: <BarChart3 className="w-5 h-5" />,
      href: '/analytics',
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
          bg-slate-900 text-white
          sticky top-0 h-screen
          transition-all duration-300 ease-in-out
          z-40
          ${isCollapsed ? 'w-16' : 'w-60'}
          overflow-hidden
        `}
      >
        {/* Sidebar Header with Logo */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700">
          {!isCollapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex-shrink-0 w-8 h-8 rounded bg-green-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">SC</span>
              </div>
              <span className="text-sm font-semibold truncate">Smart Clothesline</span>
            </div>
          )}
          {isCollapsed && (
            <div className="w-full flex justify-center">
              <div className="flex-shrink-0 w-8 h-8 rounded bg-green-600 flex items-center justify-center">
                <span className="text-white font-bold text-xs">SC</span>
              </div>
            </div>
          )}
        </div>

        {/* Menu Items */}
        <nav className="flex-1 px-2 py-6 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const active = isActive(item.href);
            return (
              <div key={item.href} className="group relative">
                <Link
                  href={item.href}
                  onClick={() => onMobileMenuChange(false)}
                  className={`
                    flex items-center rounded-lg
                    transition-all duration-300 ease-in-out
                    ${
                      active
                        ? 'bg-green-600 text-white shadow-lg'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }
                    ${isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'}
                  `}
                  onMouseEnter={() => setHoveredItem(item.href)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  {/* Icon - always visible */}
                  <span className="flex-shrink-0 flex items-center justify-center">
                    {item.icon}
                  </span>

                  {/* Label - visible only when expanded */}
                  {!isCollapsed && (
                    <span className="text-sm font-medium truncate">{item.label}</span>
                  )}
                </Link>

                {/* Tooltip for collapsed state */}
                {isCollapsed && hoveredItem === item.href && (
                  <div
                    className="
                      absolute left-full ml-2 top-1/2 -translate-y-1/2
                      bg-slate-800 text-white text-sm px-2 py-1 rounded
                      whitespace-nowrap pointer-events-none
                      z-50 shadow-lg
                    "
                  >
                    {item.label}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Collapse Toggle Button - Desktop only */}
        <div className="border-t border-slate-700 px-2 py-4">
          <button
            onClick={onToggleCollapse}
            className={`
              w-full flex items-center justify-center p-2 rounded-lg
              text-slate-300 hover:bg-slate-800 hover:text-white
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
          md:hidden fixed top-16 bottom-0 left-0
          flex flex-col
          bg-slate-900 text-white
          w-[min(15rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)]
          z-40
          transform transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          overflow-hidden shadow-2xl
        `}
      >
        {/* Mobile menu header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex-shrink-0 w-8 h-8 rounded bg-green-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">SC</span>
            </div>
            <span className="truncate text-sm font-semibold">Smart Clothesline</span>
          </div>
          <button
            onClick={() => onMobileMenuChange(false)}
            className="p-1 hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile menu items */}
        <nav className="flex-1 overflow-y-auto px-2 py-4">
          <div className="space-y-2 pb-4">
            {menuItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => onMobileMenuChange(false)}
                  className={`
                    flex min-w-0 items-center gap-3 rounded-lg px-3 py-2.5
                    transition-all duration-300 ease-in-out
                    ${
                      active
                        ? 'bg-green-600 text-white shadow-lg'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }
                  `}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  <span className="truncate text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </aside>
    </>
  );
}
