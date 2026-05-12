type Props = {
    status: string;
    reason: string;
};

export default function StatusPanel({ status, reason }: Props) {
    const isOpen = status === "OPEN";
    const bgColor = isOpen
        ? "bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/5 dark:bg-emerald-500/5 dark:border-emerald-500/30"
        : "bg-rose-500/10 border-rose-500/20 shadow-rose-500/5 dark:bg-rose-500/5 dark:border-rose-500/30";
    
    const textColor = isOpen
        ? "text-emerald-700 dark:text-emerald-400"
        : "text-rose-700 dark:text-rose-400";
    
    const statusColor = isOpen
        ? "text-emerald-600 dark:text-emerald-300"
        : "text-rose-600 dark:text-rose-300";
    
    const dotColor = isOpen ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)]" : "bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.6)]";

    return (
        <div
            className={`relative overflow-hidden rounded-[2.5rem] p-8 border backdrop-blur-md transition-all duration-500 shadow-2xl ${bgColor}`}
        >
            {/* Ambient light effect */}
            <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full blur-[60px] opacity-20 ${isOpen ? 'bg-emerald-400' : 'bg-rose-400'}`} />

            <div className="flex items-center gap-3 mb-6">
                <div className={`h-2.5 w-2.5 rounded-full ${dotColor} animate-pulse`} aria-hidden="true" />
                <h2 className={`text-[10px] font-black uppercase tracking-[0.2em] ${statusColor}`}>
                    System Status
                </h2>
            </div>

            <div className="space-y-4">
                <p className={`text-5xl font-black ${textColor} tracking-tighter`}>
                    {status}
                </p>
                <div className="flex items-start gap-2 max-w-md">
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 leading-relaxed">
                        {reason}
                    </p>
                </div>
            </div>
        </div>
    );
}

