import AutomationPage from "@/features/sensor/view/automation/AutomationPage";

interface PageProps {
  searchParams?: { lang?: string };
}

export default function automation({ searchParams }: PageProps) {
  const lang = searchParams?.lang === "id" ? "id" : "en";
  return(
    <AutomationPage lang={lang}></AutomationPage>
  )
}