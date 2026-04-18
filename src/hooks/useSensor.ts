import { useEffect, useState } from "react";
import { SensorData } from "@/models/SensorData";
import { SensorService } from "@/services/SensorService";

export function useSensor() {
    const [sensor, setSensor] = useState<SensorData | null>(null);

    useEffect(() => {
        const unsubscribe = SensorService.subscribeToSensorData((data) => {
            setSensor(data);
        });

        return () => {
            unsubscribe();
        };
    }, []);

    return sensor;
}