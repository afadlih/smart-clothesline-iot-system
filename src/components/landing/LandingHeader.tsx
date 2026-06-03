"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Cpu, Sun, Moon, Menu, X, Globe } from "lucide-react";
import { useThemeStore } from "@/stores/themeStore";

interface LandingHeaderProps {
  currentLang?: "en" | "id";
}

export default function LandingHeader({ currentLang = "en" }: LandingHeaderProps) {
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const resolvedDark =
      theme === "dark" ||
      (theme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    setIsDark(resolvedDark);
  }, [mounted, theme]);

  const handleThemeToggle = () => {
    const newIsDark = !isDark;
    setTheme(newIsDark ? "dark" : "light");
    setIsDark(newIsDark);
  };

  const t = (en: string, id: string) => (currentLang === "id" ? id : en);
  const nextLang = currentLang === "en" ? "id" : "en";
  const toggleUrl = `/?lang=${nextLang}`;

  return (
    <header className="sticky top-0 z-50 bg-white/90 dark:bg-slate-950/90 backdrop-blur border-b border-slate-200/60 dark:border-white/10 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-sm">
              <Cpu className="h-5 w-5" aria-hidden="true" />
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-teal-600 to-emerald-500 dark:from-teal-400 dark:to-emerald-400 bg-clip-text text-transparent">
              Smart Clothesline
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-6 text-sm font-semibold text-slate-600 dark:text-slate-300" aria-label="Desktop Navigation">
            <a href="#how-it-works" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors focus-visible:outline-2 focus-visible:outline-teal-500">
              {t("How it works", "Cara kerja")}
            </a>
            <a href="#features" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors focus-visible:outline-2 focus-visible:outline-teal-500">
              {t("Features", "Fitur")}
            </a>
            <a href="#safety" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors focus-visible:outline-2 focus-visible:outline-teal-500">
              {t("Safety", "Keamanan")}
            </a>
            <a href="#faq" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors focus-visible:outline-2 focus-visible:outline-teal-500">
              {t("FAQ", "FAQ")}
            </a>
          </nav>

          {/* Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {/* Language Switcher */}
            <Link
              href={toggleUrl}
              className="flex h-10 px-3 items-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-xs font-bold text-slate-600 dark:text-slate-300 focus-visible:outline-2 focus-visible:outline-teal-500"
              title={t("Switch to Indonesian", "Ubah ke Bahasa Inggris")}
            >
              <Globe className="h-3.5 w-3.5" />
              <span>{currentLang === "en" ? "ID" : "EN"}</span>
            </Link>

            {mounted && (
              <button
                onClick={handleThemeToggle}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-slate-600 dark:text-slate-300 focus-visible:outline-2 focus-visible:outline-teal-500"
                aria-label="Toggle dark mode"
                title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {isDark ? <Sun className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}
              </button>
            )}
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center px-6 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-500 text-white font-bold text-sm shadow-sm hover:from-teal-500 hover:to-emerald-400 transition-all active:scale-95 focus-visible:outline-2 focus-visible:outline-teal-500"
            >
              {t("Open Dashboard", "Buka Dasbor")}
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              href={toggleUrl}
              className="flex h-10 px-2.5 items-center gap-1 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-xs font-bold text-slate-600 dark:text-slate-300 focus-visible:outline-2 focus-visible:outline-teal-500"
            >
              <Globe className="h-3.5 w-3.5" />
              <span>{currentLang === "en" ? "ID" : "EN"}</span>
            </Link>

            {mounted && (
              <button
                onClick={handleThemeToggle}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-slate-600 dark:text-slate-300 focus-visible:outline-2 focus-visible:outline-teal-500"
                aria-label="Toggle dark mode"
              >
                {isDark ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
              </button>
            )}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors focus-visible:outline-2 focus-visible:outline-teal-500"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 px-4 py-4 space-y-3 transition-all duration-300">
          <a
            href="#how-it-works"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 font-semibold text-sm focus-visible:outline-2 focus-visible:outline-teal-500"
          >
            {t("How it works", "Cara kerja")}
          </a>
          <a
            href="#features"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 font-semibold text-sm focus-visible:outline-2 focus-visible:outline-teal-500"
          >
            {t("Features", "Fitur")}
          </a>
          <a
            href="#safety"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 font-semibold text-sm focus-visible:outline-2 focus-visible:outline-teal-500"
          >
            {t("Safety", "Keamanan")}
          </a>
          <a
            href="#faq"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 font-semibold text-sm focus-visible:outline-2 focus-visible:outline-teal-500"
          >
            {t("FAQ", "FAQ")}
          </a>
          <div className="pt-2 border-t border-slate-200 dark:border-white/5 flex flex-col gap-2">
            <Link
              href="/dashboard"
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-500 text-white font-bold text-sm shadow-md"
            >
              {t("Open Dashboard", "Buka Dasbor")}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
