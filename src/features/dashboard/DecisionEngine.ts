import { SensorData } from "../../models/SensorData";

export class DecisionEngine {
    static getClotheslineStatus(sensor: SensorData): string {
        if (sensor.isRaining() || sensor.isDark()) {
            return "TERTUTUP";
        }
        return "TERBUKA";
    }

    static getReason(sensor: SensorData): string {
        if (sensor.isRaining()) {
            return "Hujan terdeteksi → jemuran ditutup";
        }

        if (sensor.isDark()) {
            return "Cahaya rendah → jemuran ditutup";
        }

        return "Cuaca cerah → jemuran dibuka";
    }
}