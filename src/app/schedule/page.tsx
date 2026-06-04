import ScheduleScreen from "@/features/schedule/screen";

interface PageProps {
  searchParams?: { lang?: string };
}

export default function SchedulePage({ searchParams }: PageProps) {
  const lang = searchParams?.lang === "id" ? "id" : "en";
  return <ScheduleScreen lang={lang} />;
}
