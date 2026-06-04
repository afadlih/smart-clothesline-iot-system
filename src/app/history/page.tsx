import HistoryPage from "@/features/history/HistoryPage";

interface PageProps {
  searchParams?: { lang?: string };
}

export default function history({ searchParams }: PageProps) {
  const lang = searchParams?.lang === "id" ? "id" : "en";
  return(
    <HistoryPage lang={lang}></HistoryPage>
  )
}