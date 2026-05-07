interface SensorDataInput {
    temp?: number;
    humidity?: number;
    light?: number;
    rain?: number;
    status?: "OPEN" | "CLOSED" | "TERBUKA" | "TERTUTUP";
    timestamp?: string;
}

export class SensorData {
    temperature: number;
    humidity: number;
    light: number;
    rain: number;
    status: "OPEN" | "CLOSED";
    timestamp: string;

    constructor(data: SensorDataInput = {}) {
        this.temperature = data.temp ?? 0;
        this.humidity = data.humidity ?? 0;
        this.light = data.light ?? 0;
        this.rain = data.rain ?? 0;
        const normalized =
            data.status === "TERBUKA"
                ? "OPEN"
                : data.status === "TERTUTUP"
                    ? "CLOSED"
                    : data.status;
        this.status = normalized === "OPEN" || normalized === "CLOSED" ? normalized : "CLOSED";
        this.timestamp = data.timestamp ?? new Date().toISOString();
    }

    // ===== BEHAVIOR (OOP) =====

    isRaining(): boolean {
        return this.rain > 0;
    }

    isDark(threshold: number = 200): boolean {
        return this.light < threshold;
    }

    getWeatherStatus(): string {
        if (this.isRaining()) return "RAINY";
        if (this.isDark()) return "CLOUDY";
        return "CLEAR";
    }
}
