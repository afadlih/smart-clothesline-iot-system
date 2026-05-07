'use client';

import { useEffect } from "react";
import { useThemeStore } from "@/stores/themeStore";

export default function ThemeInitializer() {
  const hydrateTheme = useThemeStore((state) => state.hydrateTheme);

  useEffect(() => {
    hydrateTheme();
  }, [hydrateTheme]);

  return null;
}
