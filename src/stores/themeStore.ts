import { create } from "zustand";

type ThemeMode = "light" | "dark" | "system";

type ThemeState = {
  theme: ThemeMode;
  hydrated: boolean;
  setTheme: (theme: ThemeMode) => void;
  hydrateTheme: () => void;
};

const THEME_STORAGE_KEY = "theme";

function resolveTheme(theme: ThemeMode): "light" | "dark" {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: "system",
  hydrated: false,
  setTheme: (theme) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      const resolved = resolveTheme(theme);
      document.documentElement.classList.toggle("dark", resolved === "dark");
    }
    set({ theme });
  },
  hydrateTheme: () => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    const next: ThemeMode =
      stored === "dark" || stored === "light" || stored === "system" ? stored : "system";
    const resolved = resolveTheme(next);
    document.documentElement.classList.toggle("dark", resolved === "dark");
    if (!get().hydrated) {
      set({ theme: next, hydrated: true });
    }
  },
}));

