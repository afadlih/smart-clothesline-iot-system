"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";

export const useAuth = () => {
  const {
    user,
    loading,
    error,
    initialized,
    initAuthListener,
    clearError,
    signInWithEmailPassword,
    signInWithGoogle,
    signUpWithEmailPassword,
    signOutUser,
  } = useAuthStore();

  useEffect(() => {
    if (!initialized) {
      initAuthListener();
    }
  }, [initialized, initAuthListener]);

  return {
    user,
    loading,
    error,
    clearError,
    signInWithEmailPassword,
    signInWithGoogle,
    signUpWithEmailPassword,
    signOutUser,
  };
};
