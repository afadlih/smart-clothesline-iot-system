"use client";

import { usePathname } from "next/navigation";
import AuthGate from "@/components/auth/AuthGate";
import MainLayout from "@/components/layout/MainLayout";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAuthRoute = pathname.startsWith("/auth");

  if (isAuthRoute) {
    return <>{children}</>;
  }

  return (
    <AuthGate>
      <MainLayout>{children}</MainLayout>
    </AuthGate>
  );
}
