import { getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

/**
 * Require a Firebase environment variable.
 * Throws a clear dev error if the variable is missing so misconfigured
 * deployments fail loudly instead of silently using stale hardcoded values.
 */
function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    throw new Error(
      `[firebase] Missing required environment variable: "${name}". ` +
      `Add it to .env.local (development) or Vercel environment variables (production). ` +
      `See .env.example for the full list of required variables.`,
    );
  }
  return val;
}

const firebaseConfig = {
  apiKey:            requireEnv("NEXT_PUBLIC_FIREBASE_API_KEY"),
  authDomain:        requireEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
  projectId:         requireEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
  storageBucket:     requireEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: requireEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
  appId:             requireEnv("NEXT_PUBLIC_FIREBASE_APP_ID"),
};

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

export const db = getFirestore(app);
