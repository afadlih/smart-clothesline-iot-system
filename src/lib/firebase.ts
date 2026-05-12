import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

/**
 * Validate a Firebase environment variable that was already resolved
 * via a *static* process.env.NEXT_PUBLIC_* reference at the call site.
 *
 * Next.js can only inline NEXT_PUBLIC_* variables into the client bundle
 * when they are accessed with a literal property name
 * (e.g. process.env.NEXT_PUBLIC_FIREBASE_API_KEY).
 * Dynamic bracket access (process.env[name]) is NOT reliably replaced
 * by the bundler and will produce undefined at runtime in the browser.
 *
 * This helper therefore receives the already-resolved value so that the
 * static access stays at the call site, while validation + error formatting
 * remain centralised here.
 *
 * How to fix on Vercel when a variable is missing:
 *   1. Project Settings → Environment Variables
 *   2. Add the missing variable to the affected environment
 *      (Preview, Production, or both)
 *   3. Redeploy WITHOUT build cache:
 *      Deployments → ⋯ → Redeploy → uncheck "Use existing build cache"
 */
function requireFirebaseValue(name: string, value: string | undefined): string {
  if (!value) {
    // Detect environment
    const isCI = process.env.CI === "true" || !!process.env.NEXT_PUBLIC_VERCEL_ENV;
    const isDev = process.env.NODE_ENV === "development";

    if (!isCI && !isDev) {
      // In a real production runtime (non-CI), we should still throw to prevent broken auth
      const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV;
      const envLabel =
        vercelEnv === "production"
          ? "Vercel Production"
          : vercelEnv === "preview"
            ? "Vercel Preview"
            : "local environment";

      const fix = vercelEnv
        ? `Go to Vercel → Project Settings → Environment Variables, add "${name}", then redeploy.`
        : `Add "${name}" to your .env.local file.`;

      throw new Error(
        `[firebase] Missing required environment variable: "${name}" in ${envLabel}.\n` +
          `Fix: ${fix}`,
      );
    }

    // During build/CI or local dev, just warn and return a placeholder to allow the build to complete
    console.warn(`[firebase] Warning: Missing environment variable "${name}". Using placeholder for build safety.`);
    return "build-placeholder";
  }
  return value;
}

// Each value is accessed with a static literal key so that Next.js can
// reliably inline it into the client-side JavaScript bundle.
const firebaseConfig = {
  apiKey:            requireFirebaseValue("NEXT_PUBLIC_FIREBASE_API_KEY",            process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
  authDomain:        requireFirebaseValue("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
  projectId:         requireFirebaseValue("NEXT_PUBLIC_FIREBASE_PROJECT_ID",         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket:     requireFirebaseValue("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: requireFirebaseValue("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
  appId:             requireFirebaseValue("NEXT_PUBLIC_FIREBASE_APP_ID",             process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
};

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
