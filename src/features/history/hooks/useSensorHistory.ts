import { useEffect, useState, useCallback } from "react";
import { SensorData } from "@/models/SensorData";
import { FirestoreService } from "@/services/FirestoreService";
import { useMainStore } from "@/stores/useMainStore";

// Tentukan durasi masa berlaku cache (misal: 5 menit)
const CACHE_DURATION_MS = 5 * 60 * 1000;

export function useSensorHistory(limit: number = 20) {
  // Ambil state cache dari Zustand
  const cache = useMainStore((state) => state.firestoreHistoryCache);
  const lastFetched = useMainStore((state) => state.historyLastFetchedAt);
  const updateState = useMainStore((state) => state.updateState);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fetchHistory = useCallback(async (forceRefresh = false) => {
    const now = Date.now();
    // JIKA ada cache dan masih "fresh" (kurang dari 5 menit), SKIP fetching
    if (!forceRefresh && cache && lastFetched && (now - lastFetched < CACHE_DURATION_MS)) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await FirestoreService.getSensorHistory(limit);
      
      // Simpan data hasil fetch ke Zustand Cache
      updateState((draft) => {
        draft.firestoreHistoryCache = data;
        draft.historyLastFetchedAt = Date.now();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch history");
    } finally {
      setLoading(false);
    }
  }, [limit, cache, lastFetched, updateState]);
  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);
  return {
    history: cache || [], // Jika cache kosong, kembalikan array kosong
    // Hanya tampilkan spinner loading jika cache benar-benar kosong
    loading: loading && !cache, 
    error,
    lastFetchedAt: lastFetched,
    refetch: () => fetchHistory(true), // Expose fungsi untuk refresh manual jika dibutuhkan
  };
}