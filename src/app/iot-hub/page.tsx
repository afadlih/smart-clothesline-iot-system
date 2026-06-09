import IoTHubPage from "@/features/sensor/view/iothub/IoTHubPage";

interface PageProps {
  searchParams?: { lang?: string };
}

export default function IoTHub({ searchParams }: PageProps) {
  const lang = searchParams?.lang === "id" ? "id" : "en";
  return (
    <IoTHubPage lang={lang} />
  );
}