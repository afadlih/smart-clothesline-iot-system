"use client";

import { create } from "zustand";
import type { User } from "firebase/auth";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  getAdditionalUserInfo,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { upsertUserProfile } from "@/services/UserProfileService";

type AuthState = {
  user: User | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  initAuthListener: () => void;
  clearError: () => void;
  signInWithEmailPassword: (
    email: string,
    password: string,
    rememberMe: boolean,
  ) => Promise<void>;
  signUpWithEmailPassword: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
};

let authListenerAttached = false;

const mapAuthError = (error: unknown): string => {
  if (!error) {
    return "Authentication failed.";
  }

  if (error instanceof Error) {
    const message = error.message;
    if (message.includes("auth/invalid-credential")) {
      return "Invalid email or password.";
    }
    if (message.includes("auth/user-not-found")) {
      return "Account not found.";
    }
    if (message.includes("auth/wrong-password")) {
      return "Invalid email or password.";
    }
    if (message.includes("auth/too-many-requests")) {
      return "Too many attempts. Try again later.";
    }
    if (message.includes("auth/email-already-in-use")) {
      return "Email is already in use.";
    }
    if (message.includes("auth/invalid-email")) {
      return "Invalid email address.";
    }
    if (message.includes("auth/weak-password")) {
      return "Password is too weak.";
    }
    if (message.includes("auth/popup-closed-by-user")) {
      return "Google sign-in was closed before completion.";
    }
    if (message.includes("auth/popup-blocked")) {
      return "Popup blocked. Please allow popups and try again.";
    }
    if (message.includes("auth/cancelled-popup-request")) {
      return "Another sign-in window is already open.";
    }
    if (message.includes("auth/operation-not-allowed")) {
      return "Google Sign-In is not enabled in the Firebase Console. Go to Authentication -> Sign-in method and enable Google.";
    }
    return message;
  }

  return "Authentication failed.";
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: null,
  initialized: false,
  initAuthListener: () => {
    if (authListenerAttached) {
      return;
    }

    authListenerAttached = true;
    set({ initialized: true, loading: true, error: null });

    onAuthStateChanged(
      auth,
      (user) => {
        set({ user, loading: false });
      },
      (error) => {
        set({ error: mapAuthError(error), loading: false });
      },
    );
  },
  clearError: () => {
    set({ error: null });
  },
  signInWithEmailPassword: async (email, password, rememberMe) => {
    set({ loading: true, error: null });

    try {
      const persistence = rememberMe
        ? browserLocalPersistence
        : browserSessionPersistence;
      await setPersistence(auth, persistence);
      const credential = await signInWithEmailAndPassword(auth, email, password);
      await upsertUserProfile({
        user: credential.user,
        provider: "password",
      });
      set({ loading: false, error: null });
    } catch (error) {
      set({ loading: false, error: mapAuthError(error) });
    }
  },
  signUpWithEmailPassword: async (email, password) => {
    set({ loading: true, error: null });

    try {
      await setPersistence(auth, browserLocalPersistence);
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await upsertUserProfile({
        user: credential.user,
        provider: "password",
        role: "OPERATOR",
        isNewUser: true,
      });
      set({ loading: false, error: null });
    } catch (error) {
      set({ loading: false, error: mapAuthError(error) });
    }
  },
  signInWithGoogle: async () => {
    set({ loading: true, error: null });

    try {
      await setPersistence(auth, browserLocalPersistence);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const credential = await signInWithPopup(auth, provider);
      const additionalUserInfo = getAdditionalUserInfo(credential);
      const isNewUser = Boolean(additionalUserInfo?.isNewUser);
      await upsertUserProfile({
        user: credential.user,
        provider: "google",
        role: isNewUser ? "OPERATOR" : undefined,
        isNewUser,
      });
      set({ loading: false, error: null });
    } catch (error) {
      set({ loading: false, error: mapAuthError(error) });
    }
  },
  signOutUser: async () => {
    set({ loading: true, error: null });

    try {
      await signOut(auth);
      set({ loading: false, error: null });
    } catch (error) {
      set({ loading: false, error: mapAuthError(error) });
    }
  },
}));
