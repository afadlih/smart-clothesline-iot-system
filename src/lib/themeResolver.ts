export type ThemePalette = {
  background: string;
  card: string;
  text: string;
  mutedText: string;
  border: string;
  chart: {
    temperature: string;
    humidity: string;
    light: string;
    grid: string;
    tooltipBg: string;
    tooltipText: string;
  };
};

const lightPalette: ThemePalette = {
  background: "#f3f4f6",
  card: "#ffffff",
  text: "#111827",
  mutedText: "#6b7280",
  border: "#e5e7eb",
  chart: {
    temperature: "#ef4444",
    humidity: "#3b82f6",
    light: "#f59e0b",
    grid: "#e5e7eb",
    tooltipBg: "#ffffff",
    tooltipText: "#111827",
  },
};

const darkPalette: ThemePalette = {
  background: "#020617",
  card: "#0f172a",
  text: "#e2e8f0",
  mutedText: "#94a3b8",
  border: "#1e293b",
  chart: {
    temperature: "#f87171",
    humidity: "#60a5fa",
    light: "#fbbf24",
    grid: "#334155",
    tooltipBg: "#0f172a",
    tooltipText: "#e2e8f0",
  },
};

export function resolveThemePalette(input?: string | null): ThemePalette {
  if (input === "dark") return darkPalette;
  if (input === "light") return lightPalette;
  return lightPalette;
}

