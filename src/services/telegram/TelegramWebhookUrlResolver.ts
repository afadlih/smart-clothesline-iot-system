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
 * If Vercel Deployment Protection is still enabled, either:
 *   1. Set TELEGRAM_WEBHOOK_URL to the full external webhook URL, including
 *      _vercel_share or x-vercel-protection-bypass query params, OR
 *   2. Call webhook-sync/diagnostics with those params; this resolver preserves
 *      them when building /api/telegram/webhook.
 */

import type { NextRequest } from "next/server";

export type WebhookEnvironmentLabel = "production" | "preview" | "development" | "unknown";

const VERCEL_ACCESS_QUERY_KEYS = [
  "_vercel_share",
  "x-vercel-protection-bypass",
  "x-vercel-set-bypass-cookie",
];

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

function getVercelAccessQuery(request?: NextRequest): string {
  if (!request) return "";
  const params = new URLSearchParams();

  for (const key of VERCEL_ACCESS_QUERY_KEYS) {
    const value = request.nextUrl.searchParams.get(key);
    if (value) params.set(key, value);
  }

  const bypassFromEnv = process.env.VERCEL_PROTECTION_BYPASS_TOKEN?.trim();
  if (bypassFromEnv && !params.has("x-vercel-protection-bypass")) {
    params.set("x-vercel-protection-bypass", bypassFromEnv);
    params.set("x-vercel-set-bypass-cookie", "true");
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

export function shouldAllowEphemeralWebhook(): boolean {
  return process.env.TELEGRAM_ALLOW_EPHEMERAL_WEBHOOK?.toLowerCase() === "true";
}

export function resolveExplicitTelegramWebhookUrl(): string | null {
  const explicit = process.env.TELEGRAM_WEBHOOK_URL?.trim();
  if (!explicit) return null;
  return explicit;
}

export function resolveAppBaseUrl(request?: NextRequest): string {
  const telegramExplicit = process.env.TELEGRAM_WEBHOOK_BASE_URL;
  if (telegramExplicit) return normalizeBaseUrl(telegramExplicit);

  const fullWebhookUrl = resolveExplicitTelegramWebhookUrl();
  if (fullWebhookUrl) {
    try {
      const parsed = new URL(fullWebhookUrl);
      return `${parsed.protocol}//${parsed.host}`;
    } catch {
      // Fall through to the normal resolver; diagnostics will expose the bad URL.
    }
  }

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
  const explicit = resolveExplicitTelegramWebhookUrl();
  if (explicit) return explicit;

  const query = getVercelAccessQuery(request);
  return `${resolveAppBaseUrl(request)}/api/telegram/webhook${query}`;
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
