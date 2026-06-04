import DashboardScreen from "@/features/dashboard/DashboardScreen";

interface PageProps {
  searchParams?: { lang?: string };
}

export default function DashboardPage({ searchParams }: PageProps) {
  const lang = searchParams?.lang === "id" ? "id" : "en";
  return <DashboardScreen lang={lang} />;
}
