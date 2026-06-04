import SensorMonitorPage from "@/features/sensor/view/SensorPage";

interface PageProps {
  searchParams?: { lang?: string };
}

export default function sensor({ searchParams }: PageProps) {
  const lang = searchParams?.lang === "id" ? "id" : "en";
  return (
    <SensorMonitorPage lang={lang}></SensorMonitorPage>
  );
}