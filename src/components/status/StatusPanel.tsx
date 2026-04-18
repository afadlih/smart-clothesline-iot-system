type Props = {
    status: string;
    reason: string;
};

export default function StatusPanel({ status, reason }: Props) {
    const isOpen = status === "TERBUKA";
    const bgColor = isOpen
        ? "bg-green-100 border-green-300 shadow-green-100"
        : "bg-red-100 border-red-300 shadow-red-100";
    const textColor = isOpen ? "text-green-900" : "text-red-900";
    const statusColor = isOpen ? "text-green-700" : "text-red-700";
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
                    Status Jemuran
                </h2>
            </div>
            <p className={`text-3xl font-bold ${textColor} mb-2`}>{status}</p>
            <p className="text-sm text-gray-600">{reason}</p>
        </div>
    );
}
