/**
 * TelegramWebhookUrlResolver
 *
 * Resolves the canonical Telegram webhook URL for this deployment.
 *
 * Production should use APP_BASE_URL or TELEGRAM_WEBHOOK_BASE_URL with a stable
 * domain. Preview testing can opt into the current request origin by setting:
 *
 *   TELEGRAM_ALLOW_EPHEMERAL_WEBHOOK=true
 *
 * This prevents a preview deployment from registering the webhook to an older
 * production/stable URL that does not contain the PR route, which Telegram then
 * reports as: Wrong response from the webhook: 404 Not Found.
 */

import type { NextRequest } from "next/server";

export type WebhookEnvironmentLabel = "production" | "preview" | "development" | "unknown";

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/$/, "");
}

function requestOrigin(request?: NextRequest): string | null {
  if (!request) return null;
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return null;
  return `${proto}://${host}`;
}

export function shouldAllowEphemeralWebhook(): boolean {
  return process.env.TELEGRAM_ALLOW_EPHEMERAL_WEBHOOK?.toLowerCase() === "true";
}

/**
 * Resolve the stable base URL for this deployment.
 *
 * Priority:
 *   1. TELEGRAM_WEBHOOK_BASE_URL, if set, because it is explicit for Telegram
 *   2. Preview request origin when TELEGRAM_ALLOW_EPHEMERAL_WEBHOOK=true
 *   3. APP_BASE_URL / NEXT_PUBLIC_APP_URL
 *   4. Request origin
 *   5. localhost fallback
 */
export function resolveAppBaseUrl(request?: NextRequest): string {
  const telegramExplicit = process.env.TELEGRAM_WEBHOOK_BASE_URL;
  if (telegramExplicit) return normalizeBaseUrl(telegramExplicit);

  const origin = requestOrigin(request);
  if (process.env.VERCEL_ENV === "preview" && shouldAllowEphemeralWebhook() && origin) {
    return normalizeBaseUrl(origin);
  }

  const explicit = process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return normalizeBaseUrl(explicit);

  if (origin) return normalizeBaseUrl(origin);

  return "http://localhost:3000";
}

export function resolveTelegramWebhookUrl(request?: NextRequest): string {
  return `${resolveAppBaseUrl(request)}/api/telegram/webhook`;
}

export function isTelegramWebhookEnabled(): boolean {
  return process.env.TELEGRAM_WEBHOOK_ENABLED?.toLowerCase() === "true";
}

export function getWebhookEnvironmentLabel(): WebhookEnvironmentLabel {
  const v = process.env.VERCEL_ENV;
  if (v === "production") return "production";
  if (v === "preview") return "preview";
  if (v === "development") return "development";
  return "unknown";
}
