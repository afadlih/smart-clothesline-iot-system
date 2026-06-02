/**
 * Smart Clothesline Threshold & Semantic UX Mapper
 * 
 * This module abstracts the technical raw sensor threshold values (ADC 0-4095 or 0-10000)
 * into human-readable semantic levels and modes.
 * 
 * Hardware characteristics (1:25 mock-up):
 * 1. Rain sensor (resistance-based): behaves like a binary switch (dry ~4000, wet < 500).
 *    Hence, we use a 2-mode segmented control (Instant vs Tolerant) instead of a slider.
 * 2. Light sensor (LDR): behaves continuously, making a 5-level responsiveness slider ideal.
 */

// ==========================================
// Rain Sensor Definitions & Mappings
// isRaining = rainval < threshold
// ==========================================

export type RainMode = "INSTANT" | "TOLERANT";

export interface RainModeInfo {
  mode: RainMode;
  name: string;
  label: string;
  threshold: number;
  description: string;
}

export const RAIN_MODES: Record<RainMode, RainModeInfo> = {
  INSTANT: {
    mode: "INSTANT",
    name: "Proteksi Instan",
    label: "Instant",
    threshold: 3000,
    description: "Closes immediately on the first contact with water. Best for protecting clothes."
  },
  TOLERANT: {
    mode: "TOLERANT",
    name: "Toleransi Embun",
    label: "Tolerant",
    threshold: 1500,
    description: "Ignores light condensation or humid air. Activates only when the sensor is noticeably wet."
  }
};

export function rainThresholdToMode(threshold: number): RainMode {
  // If the threshold is closer to the tolerant value (800) than the instant value (3000)
  const diffInstant = Math.abs(threshold - RAIN_MODES.INSTANT.threshold);
  const diffTolerant = Math.abs(threshold - RAIN_MODES.TOLERANT.threshold);
  return diffInstant < diffTolerant ? "INSTANT" : "TOLERANT";
}

export function modeToRainThreshold(mode: RainMode): number {
  return RAIN_MODES[mode].threshold;
}

// ==========================================
// Light/Darkness Sensor Definitions & Mappings
// isDark = ldrval > threshold
// Inverse relationship: lower threshold = higher sensitivity to darkness
// ==========================================

export interface LightLevelInfo {
  level: number;
  name: string;
  threshold: number;
  description: string;
}

export const LIGHT_LEVELS: Record<number, LightLevelInfo> = {
  1: {
    level: 1,
    name: "Very Low (Total Dark)",
    threshold: 3276,
    description: "Closes only in complete darkness — suitable for outdoor setups with significant ambient light at night."
  },
  2: {
    level: 2,
    name: "Low (Very Dim)",
    threshold: 2457,
    description: "Closes when light drops to a very low level, such as late evening."
  },
  3: {
    level: 3,
    name: "Medium (Overcast / Dusk)",
    threshold: 1638,
    description: "Closes at dusk or under heavy overcast conditions. Recommended for most setups."
  },
  4: {
    level: 4,
    name: "High (Afternoon Shade)",
    threshold: 819,
    description: "Closes earlier when the room or environment becomes moderately shaded."
  },
  5: {
    level: 5,
    name: "Very High (Any Dimming)",
    threshold: 200,
    description: "Very sensitive — closes as soon as ambient light begins to drop from a bright state."
  }
};

export function lightThresholdToLevel(threshold: number): number {
  let closestLevel = 3; // default fallback
  let minDiff = Infinity;

  for (const levelStr in LIGHT_LEVELS) {
    const level = Number(levelStr);
    const diff = Math.abs(threshold - LIGHT_LEVELS[level].threshold);
    if (diff < minDiff) {
      minDiff = diff;
      closestLevel = level;
    }
  }

  return closestLevel;
}

export function levelToLightThreshold(level: number): number {
  const clamped = Math.max(1, Math.min(5, Math.round(level)));
  return LIGHT_LEVELS[clamped].threshold;
}
