"use client";

import { SensorHistoryItem } from "@/hooks/useSensor";

type ChartSectionProps = {
	history: SensorHistoryItem[];
};

type SparklineProps = {
	title: string;
	colorClass: string;
	stroke: string;
	unit: string;
	values: number[];
};

function Sparkline({ title, colorClass, stroke, unit, values }: SparklineProps) {
	const latestValue = values.length > 0 ? values[values.length - 1] : null;
	const minValue = values.length > 0 ? Math.min(...values) : 0;
	const maxValue = values.length > 0 ? Math.max(...values) : 0;
	const viewWidth = 100;
	const viewHeight = 36;
	const pointTop = 3;
	const pointBottom = 33;

	const points = values
		.map((value, index) => {
			const x = values.length === 1 ? 0 : (index / (values.length - 1)) * viewWidth;
			const range = maxValue - minValue;
			const normalized = range === 0 ? 0.5 : (value - minValue) / range;
			const y = pointBottom - normalized * (pointBottom - pointTop);
			return `${x},${y}`;
		})
		.join(" ");

	return (
		<article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
			<div className="mb-2 flex items-start justify-between gap-3">
				<h3 className="text-sm font-semibold text-gray-800 dark:text-slate-100">{title}</h3>
				<span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${colorClass}`}>
					{latestValue === null ? "--" : `${latestValue.toFixed(1)} ${unit}`}
				</span>
			</div>

			{values.length < 2 ? (
				<p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-xs text-gray-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
					Waiting for enough data to render chart.
				</p>
			) : (
				<svg viewBox={`0 0 ${viewWidth} ${viewHeight}`} className="h-28 w-full" role="img" aria-label={`${title} chart`}>
					<polyline
						fill="none"
						stroke="#e2e8f0"
						strokeWidth="0.8"
						points={`0,${pointBottom} ${viewWidth},${pointBottom}`}
					/>
					<polyline
						fill="none"
						stroke={stroke}
						strokeWidth="2.2"
						strokeLinecap="round"
						strokeLinejoin="round"
						points={points}
					/>
				</svg>
			)}

			<div className="mt-2 flex items-center justify-between text-[11px] text-gray-500 dark:text-slate-400">
				<span>Min: {values.length > 0 ? `${minValue.toFixed(1)} ${unit}` : "--"}</span>
				<span>Max: {values.length > 0 ? `${maxValue.toFixed(1)} ${unit}` : "--"}</span>
			</div>
		</article>
	);
}

export default function ChartSection({ history }: ChartSectionProps) {
	const ordered = [...history].reverse();
	const temperature = ordered.map((item) => item.data.temperature);
	const humidity = ordered.map((item) => item.data.humidity);
	const light = ordered.map((item) => item.data.light);

	return (
		<section className="space-y-3">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Realtime Sensor Charts</h2>
				<span className="text-xs text-gray-500 dark:text-slate-400">{history.length} latest data points</span>
			</div>
			<div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
				<Sparkline
					title="Temperature"
					unit="C"
					values={temperature}
					stroke="#ef4444"
					colorClass="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
				/>
				<Sparkline
					title="Humidity"
					unit="%"
					values={humidity}
					stroke="#3b82f6"
					colorClass="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
				/>
				<Sparkline
					title="Light"
					unit="lux"
					values={light}
					stroke="#f59e0b"
					colorClass="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
				/>
			</div>
		</section>
	);
}
