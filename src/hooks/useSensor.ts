import { useEffect, useState } from "react";
import { SensorService } from "../services/SensorService";
import { SensorData } from "../models/SensorData";

export function useSensor() {
    const [sensor, setSensor] = useState<SensorData | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            const data = await SensorService.getSensorData();
            setSensor(data);
        };

        fetchData();

        const interval = setInterval(fetchData, 3000);

        return () => clearInterval(interval);
    }, []);

    return sensor;
}