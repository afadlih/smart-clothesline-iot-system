import SettingsPage from "@/features/settings/MainSettingsPage";

interface PageProps {
  searchParams?: { lang?: string };
}

export default function settings({ searchParams }: PageProps) {
  const lang = searchParams?.lang === "id" ? "id" : "en";
  return (
    <SettingsPage lang={lang}></SettingsPage>
  )
}