import { SensorData } from "@/models/SensorData";

/**
 * DryingTimePredictor - estimates how long clothes will take to dry
 * based on current environmental conditions and historical patterns
 */
export class DryingTimePredictor {
  /**
   * Estimate drying time in minutes based on current conditions
   * Formula: time decreases with higher temp and lower initial humidity
   */
  static estimateDryingTime(
    currentHumidity: number,
    currentTemp: number,
    historyData: SensorData[] = []
  ): number {
    // Constants for drying prediction
    const TARGET_HUMIDITY = 40; // Clothes are dry at 40% humidity
    const BASE_DRYING_RATE = 0.5; // % humidity per minute at 25°C

    // If already dry, return 0
    if (currentHumidity <= TARGET_HUMIDITY) {
      return 0;
    }

    // Calculate humidity drop rate based on temperature
    // Higher temp = faster drying
    const tempFactor = Math.max(0.5, (currentTemp - 15) / 10);
    const dryingRate = BASE_DRYING_RATE * tempFactor;

    // Calculate time to reach target humidity
    const humidityDifference = currentHumidity - TARGET_HUMIDITY;
    const estimatedMinutes = Math.ceil(humidityDifference / dryingRate);

    // Adjust based on historical patterns if available
    if (historyData.length > 10) {
      const historicalAdjustment = this.getHistoricalAdjustment(historyData);
      return Math.ceil(estimatedMinutes * historicalAdjustment);
    }

    return estimatedMinutes;
  }

  /**
   * Get the next time clothes will be dry based on current conditions
   */
  static getNextReadyTime(
    currentHumidity: number,
    currentTemp: number,
    historyData: SensorData[] = []
  ): Date | null {
    const estimatedMinutes = this.estimateDryingTime(
      currentHumidity,
      currentTemp,
      historyData
    );

    if (estimatedMinutes <= 0) {
      return null; // Already dry
    }

    const readyTime = new Date();
    readyTime.setMinutes(readyTime.getMinutes() + estimatedMinutes);
    return readyTime;
  }

  /**
   * Predict drying chance as percentage (0-100)
   * Higher = more likely to dry successfully
   */
  static predictDryingChance(
    currentTemp: number,
    currentHumidity: number,
    historyData: SensorData[] = []
  ): number {
    let score = 50; // Base score

    // Temperature contributes to drying (25-35°C optimal)
    if (currentTemp >= 25 && currentTemp <= 35) {
      score += 20;
    } else if (currentTemp >= 20 && currentTemp <= 40) {
      score += 10;
    }

    // Low humidity is good for drying
    if (currentHumidity <= 50) {
      score += 20;
    } else if (currentHumidity <= 70) {
      score += 10;
    }

    // Check for rain in history (bad for drying)
    if (historyData.length > 0) {
      const recentRain = historyData.slice(-10).some((d) => d.isRaining());
      if (recentRain) {
        score -= 30;
      }

      // Check humidity trend (declining = good)
      if (historyData.length >= 5) {
        const oldHumidity =
          historyData[Math.floor(historyData.length / 2)].humidity;
        const newHumidity = historyData[historyData.length - 1].humidity;
        if (newHumidity < oldHumidity) {
          score += 15;
        }
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get human-readable drying estimate
   */
  static getDryingEstimate(
    currentHumidity: number,
    currentTemp: number,
    historyData: SensorData[] = []
  ): {
    estimatedMinutes: number;
    readyTime: Date | null;
    isDry: boolean;
    message: string;
  } {
    const estimatedMinutes = this.estimateDryingTime(
      currentHumidity,
      currentTemp,
      historyData
    );
    const readyTime = this.getNextReadyTime(
      currentHumidity,
      currentTemp,
      historyData
    );
    const isDry = currentHumidity <= 40;

    let message = "";
    if (isDry) {
      message = "Clothes are dry! 🎉";
    } else if (estimatedMinutes <= 30) {
      message = `Ready in about ${estimatedMinutes} minutes`;
    } else if (estimatedMinutes <= 120) {
      const hours = Math.round(estimatedMinutes / 60);
      message = `Ready in about ${hours} hour${hours > 1 ? "s" : ""}`;
    } else {
      const hours = Math.round(estimatedMinutes / 60);
      message = `Ready in about ${hours} hours`;
    }

    return {
      estimatedMinutes,
      readyTime,
      isDry,
      message,
    };
  }

  /**
   * Analyze historical data to get drying adjustment factor
   * Returns 0.8-1.2 multiplier based on actual patterns
   */
  private static getHistoricalAdjustment(historyData: SensorData[]): number {
    if (historyData.length < 10) return 1.0;

    // Look at last hour of data
    const lastHour = historyData.slice(-60);
    if (lastHour.length < 5) return 1.0;

    const startHumidity = lastHour[0].humidity;
    const endHumidity = lastHour[lastHour.length - 1].humidity;
    const humidityChange = startHumidity - endHumidity;

    // If humidity dropped faster than expected, drying is faster
    if (humidityChange > 5) {
      return 0.8; // 20% faster
    } else if (humidityChange < 1) {
      return 1.2; // 20% slower
    }

    return 1.0; // Normal pace
  }

  /**
   * Check if conditions are optimal for drying
   */
  static areConditionsOptimal(
    currentTemp: number,
    currentHumidity: number,
    isRaining: boolean
  ): boolean {
    return (
      currentTemp >= 25 &&
      currentTemp <= 35 &&
      currentHumidity < 70 &&
      !isRaining
    );
  }
}
