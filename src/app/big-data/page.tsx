"use client";

import { useEffect, useState } from "react";

type DailySummary = {
  date: string;
  deviceId: string;
  totalRecords: number;
  avgTemperature: number;
  avgHumidity: number;
  avgLight: number;
  rainCount: number;
  openCount: number;
  closedCount: number;
};

export default function BigDataPage() {
  const [rows, setRows] = useState<DailySummary[]>([]);

  useEffect(() => {
    fetch("/bigdata-reports/daily-summary.sample.json")
      .then((res) => res.json())
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]));
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl space-y-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Big Data Analytics</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          This page shows sample JSON generated from Hadoop MapReduce output. Hadoop is batch-only and not required for runtime.
        </p>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100">
              <tr>
                <th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Device</th><th className="px-3 py-2 text-left">Records</th><th className="px-3 py-2 text-left">Avg Temp</th><th className="px-3 py-2 text-left">Avg Humidity</th><th className="px-3 py-2 text-left">Avg Light</th><th className="px-3 py-2 text-left">Rain Count</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.date}-${row.deviceId}`} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-3 py-2">{row.date}</td><td className="px-3 py-2">{row.deviceId}</td><td className="px-3 py-2">{row.totalRecords}</td><td className="px-3 py-2">{row.avgTemperature}</td><td className="px-3 py-2">{row.avgHumidity}</td><td className="px-3 py-2">{row.avgLight}</td><td className="px-3 py-2">{row.rainCount}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td className="px-3 py-4 text-slate-500" colSpan={7}>No sample data found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
