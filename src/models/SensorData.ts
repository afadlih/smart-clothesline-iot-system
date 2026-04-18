interface SensorDataInput {
    temp?: number;
    humidity?: number;
    light?: number;
    rain?: number;
    timestamp?: string;
}

export class SensorData {
    temperature: number;
    humidity: number;
    light: number;
    rain: number;
    timestamp: string;

    constructor(data: SensorDataInput = {}) {
        this.temperature = data.temp ?? 0;
        this.humidity = data.humidity ?? 0;
        this.light = data.light ?? 0;
        this.rain = data.rain ?? 0;
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
        if (this.isRaining()) return "HUJAN";
        if (this.isDark()) return "MENDUNG";
        return "CERAH";
    }
}