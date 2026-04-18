'use client';

import React, { useState, useEffect } from 'react';
import TopBar from './TopBar';
import Sidebar from './Sidebar';

/**
 * MainLayout Component
 * 
 * Main layout wrapper that combines TopBar and Sidebar with responsive behavior.
 * Manages mobile menu state and sidebar collapse state across the application.
 * 
 * Features:
 * - Responsive design (mobile drawer sidebar vs desktop push sidebar)
 * - Persistent sidebar state (localStorage)
 * - Overlay backdrop for mobile menu
 */
export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load sidebar state from localStorage on component mount
  useEffect(() => {
    const savedState = localStorage.getItem('sidebar-collapsed');
    if (savedState !== null) {
      setIsSidebarCollapsed(JSON.parse(savedState));
    }
    setMounted(true);
  }, []);

  // Save sidebar state to localStorage when it changes
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('sidebar-collapsed', JSON.stringify(isSidebarCollapsed));
    }
  }, [isSidebarCollapsed, mounted]);

  // Close mobile menu when sidebar collapse state changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [isSidebarCollapsed]);

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 dark:bg-slate-950 dark:text-slate-100 overflow-hidden transition-colors duration-300">
      {/* Mobile backdrop overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar component - responsive positioning */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileMenuOpen={isMobileMenuOpen}
        onMobileMenuChange={setIsMobileMenuOpen}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-transparent">
        {/* Top bar - sticky header */}
        <TopBar
          onHamburgerClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />

        {/* Main scrollable content area */}
        <main className="flex-1 overflow-auto bg-transparent transition-colors duration-300">
          {children}
        </main>
      </div>
    </div>
  );
}
