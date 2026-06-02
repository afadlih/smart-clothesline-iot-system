/**
 * TelegramWebhookUrlResolver
 *
 * Resolves the canonical Telegram webhook URL for this deployment.
 *
 * Problem solved:
 *   Vercel generates a unique URL per deploy (e.g. smart-clothesline-xxxx.vercel.app).
 *   Using that URL as TELEGRAM_WEBHOOK_URL causes an endless env-change loop, and
 *   each preview branch would steal the production webhook (Telegram allows only one
 *   webhook per bot token).
 *
 * Solution:
 *   - Use APP_BASE_URL (or NEXT_PUBLIC_APP_URL) as the stable canonical domain.
 *   - Gate webhook registration with TELEGRAM_WEBHOOK_ENABLED=true.
 *   - Preview/fix branches should have TELEGRAM_WEBHOOK_ENABLED=false (or unset).
 *   - Production uses the stable custom domain or assigned Vercel production alias.
 *
 * Environment setup guide:
 *   Production:
 *     APP_BASE_URL=https://smart-clothesline-iot-system.vercel.app
 *     TELEGRAM_WEBHOOK_ENABLED=true
 *
 *   Staging (separate bot token required):
 *     APP_BASE_URL=https://your-stable-staging.vercel.app
 *     TELEGRAM_WEBHOOK_ENABLED=true
 *     TELEGRAM_BOT_TOKEN=staging_bot_token
 *
 *   Preview/fix branches:
 *     TELEGRAM_WEBHOOK_ENABLED=false   (or simply unset)
 *
 * Server-side only — never import from browser/client components.
 */

import type { NextRequest } from "next/server";

export type WebhookEnvironmentLabel = "production" | "preview" | "development" | "unknown";

/**
 * Resolve the stable base URL for this deployment.
 *
 * Priority:
 *   1. APP_BASE_URL env var (recommended — set once per environment in Vercel)
 *   2. NEXT_PUBLIC_APP_URL env var (legacy fallback)
 *   3. x-forwarded-host / host from request headers (last resort for edge/middleware)
 *   4. http://localhost:3000 (local dev only)
 */
export function resolveAppBaseUrl(request?: NextRequest): string {
  // Preferred: explicit stable base URL set in Vercel Environment Variables
  const explicit = process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  // Last resort from request headers (useful in edge middleware)
  if (request) {
    const proto = request.headers.get("x-forwarded-proto") ?? "https";
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    if (host) return `${proto}://${host}`;
  }

  // Local dev fallback
  return "http://localhost:3000";
}

/**
 * Build the full webhook URL: baseUrl + /api/telegram/webhook
 */
export function resolveTelegramWebhookUrl(request?: NextRequest): string {
  return `${resolveAppBaseUrl(request)}/api/telegram/webhook`;
}

/**
 * Whether webhook registration is enabled for this environment.
 *
 * Must be explicitly opt-in: TELEGRAM_WEBHOOK_ENABLED=true
 * Preview/fix branches should NOT set this to avoid stealing the production webhook.
 */
export function isTelegramWebhookEnabled(): boolean {
  return process.env.TELEGRAM_WEBHOOK_ENABLED?.toLowerCase() === "true";
}

/**
 * Human-readable label for the current Vercel environment.
 */
export function getWebhookEnvironmentLabel(): WebhookEnvironmentLabel {
  const v = process.env.VERCEL_ENV;
  if (v === "production") return "production";
  if (v === "preview") return "preview";
  if (v === "development") return "development";
  return "unknown";
}
