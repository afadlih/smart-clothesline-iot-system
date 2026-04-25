import Link from "next/link";

export default function NotFound() {
    return (
        <main className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
            <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center p-6">
                <section className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
                    <div className="inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                        <span
                            className="h-2 w-2 animate-pulse rounded-full bg-red-500"
                            aria-hidden="true"
                        />
                        ERROR 404
                    </div>

                    <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900">
                        Page not found
                    </h1>
                    <p className="mt-2 text-sm text-gray-600">
                        The page you requested is unavailable or has been moved.
                    </p>

                    <div className="mt-8 h-px bg-gray-200" />

                    <div className="mt-6 flex flex-wrap items-center gap-3">
                        <Link
                            href="/"
                            className="inline-flex items-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-gray-800"
                        >
                            Back to Dashboard
                        </Link>
                        <Link
                            href="/sensor"
                            className="inline-flex items-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-all duration-200 hover:bg-gray-50"
                        >
                            Open Sensor Monitor
                        </Link>
                    </div>
                </section>
            </div>
        </main>
    );
}
