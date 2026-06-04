import NotificationsPage from "@/features/notification/NotificationPage";

interface PageProps {
  searchParams?: { lang?: string };
}

export default function notification({ searchParams }: PageProps) {
  const lang = searchParams?.lang === "id" ? "id" : "en";
  return(
    <NotificationsPage lang={lang}></NotificationsPage>
  )
}