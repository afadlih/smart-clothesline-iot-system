"use client";

import { useSensorHistory } from "@/hooks/useSensorHistory";

export default function HistoryPage() {
  const { history, loading, error } = useSensorHistory(20);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-6 dark:from-slate-900 dark:to-slate-950">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">History Sensor</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Riwayat data sensor yang diterima dari MQTT</p>
        </header>

        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-slate-800">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-800 dark:text-slate-100">Data History</h2>
            <span className="text-xs text-gray-500 dark:text-slate-400">{history.length} data terakhir</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-slate-800">
              <thead className="bg-gray-50 dark:bg-slate-800/60">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-slate-300">Waktu</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-slate-300">Suhu</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-slate-300">Kelembapan</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-slate-300">Cahaya</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-slate-300">Hujan</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-slate-300">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-slate-300">Alasan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-gray-500 dark:text-slate-400">
                      Memuat data history dari Firestore...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-red-600 dark:text-red-400">
                      Gagal memuat history: {error}
                    </td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-gray-500 dark:text-slate-400">
                      Belum ada data history di Firestore.
                    </td>
                  </tr>
                ) : (
                  history.map((item, index) => (
                    <tr key={`${item.timestamp}-${index}`} className="hover:bg-gray-50/80 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{new Date(item.timestamp).toLocaleString("id-ID")}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-slate-100">{item.temperature.toFixed(1)} C</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-slate-100">{item.humidity.toFixed(1)} %</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-slate-100">{item.light.toFixed(0)}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-slate-100">{item.isRaining() ? "Ya" : "Tidak"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${item.status === "TERBUKA" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{item.status === "TERBUKA" ? "Cuaca cerah -> jemuran dibuka" : "Hujan/cahaya rendah -> jemuran ditutup"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
