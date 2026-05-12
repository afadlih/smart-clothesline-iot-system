"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function RootPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen items-center justify-center bg-[var(--bg-primary)]">
      <p className="text-sm text-gray-500">Redirecting...</p>
    </div>
  );
}
