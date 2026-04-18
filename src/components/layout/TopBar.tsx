'use client';

import React, { useState, useEffect } from 'react';
import {
  Menu,
  Bell,
  Moon,
  Sun,
  ChevronDown,
  User,
  LogOut,
} from 'lucide-react';

interface TopBarProps {
  onHamburgerClick: () => void;
}

/**
 * TopBar Component
 * 
 * Sticky header with status indicator, notifications, theme toggle, and user menu.
 * 
 * Features:
 * - Online status indicator with real-time clock
 * - Hamburger menu toggle (mobile)
 * - Notification bell with badge
 * - Dark/Light mode toggle
 * - User avatar dropdown
 * - Sticky positioning with shadow
 */
export default function TopBar({ onHamburgerClick }: TopBarProps) {
  const [isDark, setIsDark] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Initialize theme
  useEffect(() => {
    setMounted(true);

    // Check for dark mode preference
    const isDarkMode = localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    setIsDark(isDarkMode);
  }, []);

  const handleThemeToggle = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    localStorage.setItem('theme', newIsDark ? 'dark' : 'light');
    
    // Apply theme to document (optional - implement in your globals.css)
    if (newIsDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  if (!mounted) {
    return (
      <header className="bg-white border-b border-gray-200 h-16" />
    );
  }

  return (
    <header
      className={`
        sticky top-0 z-40
        bg-white border-b border-gray-200
        h-16 shadow-sm
        transition-colors duration-300
      `}
    >
      <div className="h-full px-4 md:px-6 flex items-center justify-between gap-4">
        {/* Left section: Hamburger menu (mobile) */}
        <div className="flex items-center gap-4">
          <button
            onClick={onHamburgerClick}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        {/* Right section: Notification, theme toggle, user menu */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Notification Bell */}
          <button
            className="
              relative p-2 rounded-lg
              text-gray-600 hover:bg-gray-100
              transition-colors
            "
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {/* Notification badge */}
            <span
              className={`
                absolute top-1 right-1
                w-2 h-2 bg-red-500 rounded-full
                animate-pulse
              `}
            />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={handleThemeToggle}
            className="
              p-2 rounded-lg
              text-gray-600 hover:bg-gray-100
              transition-colors
            "
            aria-label="Toggle dark mode"
            title={isDark ? 'Light mode' : 'Dark mode'}
          >
            {isDark ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>

          {/* User Avatar Dropdown */}
          <div className="relative ml-2 sm:ml-4">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="
                flex items-center gap-2 p-1 rounded-lg
                hover:bg-gray-100 transition-colors
              "
              aria-label="User menu"
            >
              {/* Avatar */}
              <div
                className={`
                  w-8 h-8 rounded-full bg-gradient-to-br
                  from-green-500 to-blue-500
                  flex items-center justify-center
                  text-white text-sm font-semibold
                  flex-shrink-0
                `}
              >
                JD
              </div>

              {/* Dropdown arrow - visible on larger screens */}
              <ChevronDown className="w-4 h-4 text-gray-600 hidden sm:block" />
            </button>

            {/* Dropdown menu */}
            {isUserMenuOpen && (
              <div
                className={`
                  absolute right-0 mt-2
                  bg-white rounded-lg shadow-lg
                  border border-gray-200
                  min-w-48 z-50
                  py-1
                `}
              >
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                  }}
                  className="
                    w-full text-left px-4 py-2
                    text-sm text-gray-700
                    hover:bg-gray-50
                    transition-colors
                    flex items-center gap-2
                  "
                >
                  <User className="w-4 h-4" />
                  Profile
                </button>
                <hr className="my-1" />
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                  }}
                  className="
                    w-full text-left px-4 py-2
                    text-sm text-red-600
                    hover:bg-red-50
                    transition-colors
                    flex items-center gap-2
                  "
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
