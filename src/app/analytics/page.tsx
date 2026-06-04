import AnalyticsPage from "@/features/analytics/analytics";

interface PageProps {
  searchParams?: { lang?: string };
}

export default function analytics({ searchParams }: PageProps) {
  const lang = searchParams?.lang === "id" ? "id" : "en";
  return (
    <AnalyticsPage lang={lang} />
  );
}