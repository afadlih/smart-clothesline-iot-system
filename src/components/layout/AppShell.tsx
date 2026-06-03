"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";

const AuthGate = dynamic(() => import("@/components/auth/AuthGate"), { ssr: false });
const MainLayout = dynamic(() => import("@/components/layout/MainLayout"), { ssr: false });

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAuthRoute = pathname.startsWith("/auth");
  const isLandingPage = pathname === "/";

  if (isAuthRoute || isLandingPage) {
    return <>{children}</>;
  }

  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
          <p className="text-sm font-medium text-slate-500 animate-pulse">Initializing app...</p>
        </div>
      </div>
    }>
      <AuthGate>
        <MainLayout>{children}</MainLayout>
      </AuthGate>
    </Suspense>
  );
}
