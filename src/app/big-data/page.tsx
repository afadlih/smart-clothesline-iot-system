import BigDataPage from "@/features/big-data/BigDataPage";

interface PageProps {
  searchParams?: { lang?: string };
}

export default function bigdata({ searchParams }: PageProps) {
  const lang = searchParams?.lang === "id" ? "id" : "en";
  return (
    <BigDataPage lang={lang} />
  );
}