import { getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

/**
 * Require a Firebase environment variable.
 *
 * Throws a clear, actionable error when a variable is missing so that
 * misconfigured Vercel Preview / Production deployments fail loudly at
 * startup instead of silently connecting to the wrong project.
 *
 * How to fix on Vercel:
 *   1. Project Settings → Environment Variables
 *   2. Add the missing variable to the affected environment
 *      (Preview, Production, or both)
 *   3. Redeploy WITHOUT build cache:
 *      Deployments → ⋯ → Redeploy → uncheck "Use existing build cache"
 */
function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    // Detect Vercel environment so the error message is immediately actionable
    const vercelEnv = process.env.VERCEL_ENV; // "production" | "preview" | "development" | undefined
    const envLabel = vercelEnv === "production"
      ? "Vercel Production"
      : vercelEnv === "preview"
        ? "Vercel Preview"
        : vercelEnv === "development"
          ? "Vercel Development"
          : "local (.env.local)";

    const fix = vercelEnv
      ? `Go to Vercel → Project Settings → Environment Variables, add "${name}" to the "${vercelEnv}" environment, then redeploy WITHOUT build cache.`
      : `Add "${name}" to your .env.local file (copy from .env.example).`;

    throw new Error(
      `[firebase] Missing required environment variable: "${name}" in ${envLabel}.\n` +
      `Fix: ${fix}\n` +
      `See .env.example for the full list of required NEXT_PUBLIC_FIREBASE_* variables.`,
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
