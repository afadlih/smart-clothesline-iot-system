type Props = {
    title: string;
    value: string | number;
    subtitle?: string;
    accent?: "warning" | "danger";
};

export default function SensorCard({ title, value, subtitle, accent }: Props) {
    const accentClass = accent === "warning"
        ? "border-amber-200 dark:border-amber-500/30 bg-amber-50/30 dark:bg-amber-500/5"
        : accent === "danger"
            ? "border-rose-200 dark:border-rose-500/30 bg-rose-50/30 dark:bg-rose-500/5"
            : "border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5";

    const dotClass = accent === "warning"
        ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
        : accent === "danger"
            ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
            : "bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.5)]";

    return (
        <div
            className={`group relative overflow-hidden rounded-[2rem] p-6 border transition-all duration-500 hover:shadow-2xl hover:shadow-teal-500/10 hover:-translate-y-1 ${accentClass} backdrop-blur-sm`}
        >
            {/* Decorative background element */}
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-teal-500/5 blur-2xl transition-opacity group-hover:opacity-100 opacity-0" />
            
            <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                    {title}
                </span>
                <div className={`h-2 w-2 rounded-full ${dotClass}`} />
            </div>

            <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                    {value}
                </span>
            </div>
            
            {subtitle && (
                <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {subtitle}
                </p>
            )}
        </div>
    );
}

