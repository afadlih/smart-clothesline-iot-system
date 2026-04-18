type Props = {
    title: string;
    value: string | number;
    subtitle?: string;
    accent?: "warning" | "danger";
};

export default function SensorCard({ title, value, subtitle, accent }: Props) {
    const borderClass = accent === "warning"
        ? "border-yellow-300"
        : accent === "danger"
            ? "border-red-300"
            : "border-gray-200";

    const dotClass = accent === "warning"
        ? "bg-yellow-400"
        : accent === "danger"
            ? "bg-red-500"
            : "bg-transparent";

    return (
        <div
            className={`relative bg-white rounded-xl shadow-sm p-6 border ${borderClass} hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`}
        >
            {accent && (
                <span
                    className={`absolute right-4 top-4 h-2.5 w-2.5 rounded-full ${dotClass}`}
                    aria-hidden="true"
                />
            )}
            <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">
                {title}
            </p>
            <p className="text-2xl font-semibold text-gray-900 mt-2">{value}</p>
            {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
    );
}
