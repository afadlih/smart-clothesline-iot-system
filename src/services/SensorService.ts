import { SensorData } from "@/models/SensorData";
import { mqttService, type SensorMessage } from "./MQTTService";

export class SensorService {
    static subscribeToSensorData(
        callback: (sensorData: SensorData) => void,
    ): () => void {
        return mqttService.onMessage((message) => {
            callback(SensorService.toSensorData(message));
        });
    }

    private static toSensorData(message: SensorMessage): SensorData {
        return new SensorData({
            temp: message.temperature,
            humidity: message.humidity,
            light: message.light,
            rain: message.rain ? 1 : 0,
            timestamp: new Date().toISOString(),
        });
    }
}