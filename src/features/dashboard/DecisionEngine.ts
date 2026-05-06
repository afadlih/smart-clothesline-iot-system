import { SensorData } from "../../models/SensorData";

export class DecisionEngine {
  static getClotheslineStatus(
    sensor: SensorData,
    config?: { lightThreshold?: number; autoCloseOnRain?: boolean; autoCloseOnDark?: boolean },
  ): string {
    const lightThreshold = config?.lightThreshold ?? 200;
    const closeOnRain = config?.autoCloseOnRain ?? true;
    const closeOnDark = config?.autoCloseOnDark ?? true;

    if ((closeOnRain && sensor.isRaining()) || (closeOnDark && sensor.isDark(lightThreshold))) {
      return "CLOSED";
    }
    return "OPEN";
  }

  static getReason(
    sensor: SensorData,
    config?: { lightThreshold?: number; autoCloseOnRain?: boolean; autoCloseOnDark?: boolean },
  ): string {
    const lightThreshold = config?.lightThreshold ?? 200;
    const closeOnRain = config?.autoCloseOnRain ?? true;
    const closeOnDark = config?.autoCloseOnDark ?? true;

    if (closeOnRain && sensor.isRaining()) {
      return "Rain detected -> clothesline closed";
    }

    if (closeOnDark && sensor.isDark(lightThreshold)) {
      return `Low light (< ${lightThreshold}) -> clothesline closed`;
    }

    return "Clear weather -> clothesline open";
  }
}
