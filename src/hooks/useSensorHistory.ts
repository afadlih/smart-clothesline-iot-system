import { useEffect, useState } from "react";
import { SensorData } from "@/models/SensorData";
import { FirestoreService } from "@/services/FirestoreService";

export function useSensorHistory(limit: number = 20) {
  const [history, setHistory] = useState<SensorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    const fetchHistory = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await FirestoreService.getSensorHistory(limit);
        if (!active) {
          return;
        }
        setHistory(data);
        setLastFetchedAt(Date.now());
      } catch (err) {
        if (!active) {
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to fetch history");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void fetchHistory();

    return () => {
      active = false;
    };
  }, [limit]);

  return {
    history,
    loading,
    error,
    lastFetchedAt,
  };
}
