import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/lib/firebase";

export type UserRole = "ADMIN" | "OPERATOR" | "VIEWER";

type UpsertUserProfileInput = {
  user: User;
  provider: "google" | "password" | string;
  role?: UserRole;
  isNewUser?: boolean;
};

const resolveDisplayName = (user: User): string | null => {
  if (user.displayName && user.displayName.trim()) {
    return user.displayName.trim();
  }

  if (user.email) {
    const [prefix] = user.email.split("@");
    if (prefix) {
      return prefix;
    }
  }

  return null;
};

export const upsertUserProfile = async ({
  user,
  provider,
  role,
  isNewUser = false,
}: UpsertUserProfileInput): Promise<void> => {
  const payload: Record<string, unknown> = {
    uid: user.uid,
    email: user.email ?? null,
    displayName: resolveDisplayName(user),
    provider,
    updatedAt: serverTimestamp(),
  };

  if (isNewUser) {
    payload.createdAt = serverTimestamp();
    if (role) {
      payload.role = role;
    }
  }

  const ref = doc(db, "users", user.uid);
  await setDoc(ref, payload, { merge: true });
};
