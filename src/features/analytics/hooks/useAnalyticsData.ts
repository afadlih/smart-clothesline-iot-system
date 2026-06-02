import { useState, useEffect, useCallback } from "react";
import { AnalyticsDataService, type TimeRange, type AnalyticsResult } from "@/services/AnalyticsDataService";
import { logger } from "@/lib/logger";

export function useAnalyticsData(initialRange: TimeRange = "24h") {
  const [range, setRange] = useState<TimeRange>(initialRange);
  const [result, setResult] = useState<AnalyticsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (selectedRange: TimeRange) => {
    setLoading(true);
    setError(null);
    try {
      const data = await AnalyticsDataService.getHistoricalData(selectedRange);
      setResult(data);
    } catch (err) {
      const msg = "Failed to load historical data";
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
    refresh: () => fetchData(range),
  };
}
