type Props = {
    status: string;
    reason: string;
};

export default function StatusPanel({ status, reason }: Props) {
    const isOpen = status === "TERBUKA" || status === "OPEN";
    const bgColor = isOpen
        ? "bg-green-100 border-green-300 shadow-green-100 dark:bg-green-900/30 dark:border-green-700 dark:shadow-green-900/30"
        : "bg-red-100 border-red-300 shadow-red-100 dark:bg-red-900/30 dark:border-red-700 dark:shadow-red-900/30";
    const textColor = isOpen
        ? "text-green-900 dark:text-green-200"
        : "text-red-900 dark:text-red-200";
    const statusColor = isOpen
        ? "text-green-700 dark:text-green-300"
        : "text-red-700 dark:text-red-300";
    const dotColor = isOpen ? "bg-green-500" : "bg-red-500";

    return (
        <div
            className={`rounded-2xl shadow-lg p-6 border ${bgColor} transition-all duration-300`}
        >
            <div className="flex items-center gap-2 mb-2">
                <span
                    className={`h-2.5 w-2.5 rounded-full ${dotColor} animate-pulse`}
                    aria-hidden="true"
                />
                <h2 className={`text-xs uppercase tracking-wide font-semibold ${statusColor}`}>
                    Clothesline Status
                </h2>
            </div>
            <p className={`text-3xl font-bold ${textColor} mb-2`}>{status}</p>
            <p className="text-sm text-gray-600 dark:text-slate-300">{reason}</p>
        </div>
    );
}
