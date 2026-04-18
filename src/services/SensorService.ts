import { SensorData } from "../models/SensorData";

export class SensorService {
    static async getSensorData(): Promise<SensorData> {
        // sementara mock (nanti diganti ESP32)
        const mock = {
            temp: 28,
            humidity: 70,
            light: Math.random() * 500,
            rain: Math.random() > 0.7 ? 1 : 0,
            timestamp: new Date().toISOString()
        };

        return new SensorData(mock);
    }
}