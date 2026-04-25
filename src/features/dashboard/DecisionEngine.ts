import { SensorData } from "../../models/SensorData";

export class DecisionEngine {
  static getClotheslineStatus(sensor: SensorData): string {
    if (sensor.isRaining() || sensor.isDark()) {
      return "CLOSED";
    }
    return "OPEN";
  }

  static getReason(sensor: SensorData): string {
    if (sensor.isRaining()) {
      return "Rain detected -> clothesline closed";
    }

    if (sensor.isDark()) {
      return "Low light -> clothesline closed";
    }

    return "Clear weather -> clothesline open";
  }
}
