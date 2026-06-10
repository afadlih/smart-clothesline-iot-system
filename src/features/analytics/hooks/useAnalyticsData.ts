import { useState, useEffect, useCallback } from "react";
import { AnalyticsDataService, type TimeRange, type AnalyticsResult } from "@/features/analytics/services/AnalyticsDataService";
import { SensorData } from "@/models/SensorData";
import axios from "axios";
import { logger } from "@/lib/logger";

const hadoopCache: Record<string, AnalyticsResult> = {};

function calculateStats(rows: any[]) {
  if (rows.length === 0) {
    return {
      avgTemp: 0,
      avgHumidity: 0,
      avgLight: 0,
      rainCount: 0,
      dataPoints: 0,
      openPercentage: 0,
    };
  }

  let totalTemp = 0;
  let totalHumidity = 0;
  let totalLight = 0;
  let rainCount = 0;
  let openCount = 0;

  rows.forEach((row) => {
    totalTemp += row.temperature || 0;
    totalHumidity += row.humidity || 0;
    totalLight += row.light || 0;
    if (row.rain === true) rainCount++;
    if (row.status === "OPEN" || row.status === "TERBUKA") openCount++
  });

  return {
    avgTemp: totalTemp / rows.length,
    avgHumidity: totalHumidity / rows.length,
    avgLight: totalLight / rows.length,
    rainCount,
    dataPoints: rows.length,
    openPercentage: (openCount / rows.length) * 100,
  }
}

const getActiveDeviceId = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("smart-clothesline-active-device-id-v1")
}

export function useAnalyticsData(initialRange: TimeRange = "24h") {
  const [range, setRange] = useState<TimeRange>(initialRange);
  const [result, setResult] = useState<AnalyticsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (selectedRange: TimeRange, forceRefresh = false) => {
    const activeDeviceId = getActiveDeviceId();

    if (!activeDeviceId) {
      setError("Silakan pilih perangkat IoT Anda terlebih dahulu.");
      setLoading(false);
      return;
    }

    const cacheKey = `${activeDeviceId}_${selectedRange}`;

    setLoading(true);
    setError(null);
    try {
      // Untuk kurun waktu 1h, 6h, dan 24h akan ambil data langsung dari firestore, dan untuk jangka waktu panjang 7d dan 30d maka akan ambil hadoop
      if (selectedRange === "7d" || selectedRange === "30d") {
        if (hadoopCache[cacheKey] && !forceRefresh) {
          console.log(`[Analytics] Menggunakan data Hadoop dari cache memori client.`);
          setResult(hadoopCache[cacheKey]);
          setLoading(false);
          return;
        }
        console.log(`[Analytics] Mengambil data historis dari Hadoop untuk device ${activeDeviceId}`);
        const response = await axios.get(`/api/analytics/report?deviceId=${activeDeviceId}`);

        if (!response.data.success) {
          throw new Error(response.data.error || "Gagal memproses data Hadoop.");
        }

        const rawRows = response.data.data || [];

        const sensorDataList = rawRows.map((row: any) => {
          return new SensorData({
            temp: row.temperature,
            humidity: row.humidity,
            light: row.light,
            rain: row.rain ? 1 : 0,
            status: row.status,
            timestamp: new Date(row.receivedAt).toISOString()
          });
        });

        const stats = calculateStats(rawRows);
        let dataSufficiency: "empty" | "minimal" | "usable" | "strong" = "empty";
        if (rawRows.length > 100) {
          dataSufficiency = "strong";
        } else if (rawRows.length >= 10) {
          dataSufficiency = "usable";
        } else if (rawRows.length > 0) {
          dataSufficiency = "minimal";
        }

        const finalResult: AnalyticsResult = {
          rangeStart: rawRows.length > 0 ? rawRows[0].receivedAt : Date.now(),
          rangeEnd: rawRows.length > 0 ? rawRows[rawRows.length - 1].receivedAt : Date.now(),
          source: "firestore",
          data: sensorDataList,
          stats,
          recordCount: rawRows.length,
          dataSufficiency
        };

        hadoopCache[cacheKey] = finalResult;
        setResult(finalResult);
      } else {
        console.log(`[Analytics] Mengambil data real-time dari Firestore...`);
        const data = await AnalyticsDataService.getHistoricalData(selectedRange, activeDeviceId);
        setResult(data);
      }
    } catch (err: any) {
      const msg = "Gagal memuat data analitik sistem.";
      setError(msg);
      logger.error("analytics", msg, err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(range);
  }, [range, fetchData]);

  return {
    range,
    setRange,
    result,
    loading,
    error,
    refresh: () => fetchData(range, true),
  };
}
