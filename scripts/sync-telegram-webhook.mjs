/**
 * scripts/sync-telegram-webhook.mjs
 *
 * Deploy-time Telegram webhook synchronizer.
 *
 * It calls Telegram Bot API directly instead of calling this app's
 * /api/telegram/webhook-sync route. This is intentional: Vercel preview
 * deployments may be behind Deployment Protection during build, while Telegram
 * still needs the final public webhook URL registered immediately.
 *
 * URL resolution priority:
 *   1. TELEGRAM_WEBHOOK_URL       full URL, may include query/bypass token
 *   2. TELEGRAM_WEBHOOK_BASE_URL  base URL + /api/telegram/webhook
 *   3. preview + VERCEL_URL       https://$VERCEL_URL/api/telegram/webhook
 *   4. APP_BASE_URL               base URL + /api/telegram/webhook
 *   5. NEXT_PUBLIC_APP_URL        base URL + /api/telegram/webhook
 */

const token = process.env.TELEGRAM_BOT_TOKEN;
const enabled = process.env.TELEGRAM_WEBHOOK_ENABLED?.toLowerCase() === "true";
const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET || undefined;
const dropPendingUpdates = process.env.TELEGRAM_DROP_PENDING_UPDATES_ON_WEBHOOK_SETUP !== "false";
const vercelEnv = process.env.VERCEL_ENV || "unknown";

function normalizeBaseUrl(value) {
  return value.replace(/\/$/, "");
}

function withHttps(value) {
  if (!value) return null;
  if (value.startsWith("https://") || value.startsWith("http://")) return value;
  return `https://${value}`;
}

function appendWebhookPath(baseUrl) {
  return `${normalizeBaseUrl(baseUrl)}/api/telegram/webhook`;
}

function appendAccessQuery(url) {
  const share = process.env.VERCEL_SHARE_TOKEN?.trim();
  const bypass = process.env.VERCEL_PROTECTION_BYPASS_TOKEN?.trim();

  if (!share && !bypass) return url;

  const parsed = new URL(url);
  if (share && !parsed.searchParams.has("_vercel_share")) {
    parsed.searchParams.set("_vercel_share", share);
  }
  if (bypass && !parsed.searchParams.has("x-vercel-protection-bypass")) {
    parsed.searchParams.set("x-vercel-protection-bypass", bypass);
    parsed.searchParams.set("x-vercel-set-bypass-cookie", "true");
  }
  return parsed.toString();
}

function resolveWebhookUrl() {
  const explicit = process.env.TELEGRAM_WEBHOOK_URL?.trim();
  if (explicit) return explicit;

  const explicitBase = process.env.TELEGRAM_WEBHOOK_BASE_URL?.trim();
  if (explicitBase) return appendAccessQuery(appendWebhookPath(withHttps(explicitBase)));

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelEnv === "preview" && process.env.TELEGRAM_ALLOW_EPHEMERAL_WEBHOOK === "true" && vercelUrl) {
    return appendAccessQuery(appendWebhookPath(withHttps(vercelUrl)));
  }

  const appBase = process.env.APP_BASE_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appBase) return appendAccessQuery(appendWebhookPath(withHttps(appBase)));

  if (vercelUrl) return appendAccessQuery(appendWebhookPath(withHttps(vercelUrl)));

  return null;
}

async function telegram(method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({ ok: false, description: "Invalid Telegram JSON response" }));
  if (!response.ok || !data.ok) {
    throw new Error(`${method} failed: ${data.description || response.statusText}`);
  }
  return data;
}

async function main() {
  if (!enabled) {
    console.log("[telegram:webhook] skipped: TELEGRAM_WEBHOOK_ENABLED is not true");
    return;
  }

  if (!token) {
    console.log("[telegram:webhook] skipped: TELEGRAM_BOT_TOKEN is missing");
    return;
  }

  const webhookUrl = resolveWebhookUrl();
  if (!webhookUrl) {
    throw new Error("Unable to resolve Telegram webhook URL. Set TELEGRAM_WEBHOOK_URL, TELEGRAM_WEBHOOK_BASE_URL, APP_BASE_URL, or VERCEL_URL.");
  }

  console.log(`[telegram:webhook] syncing for ${vercelEnv}`);
  console.log(`[telegram:webhook] target: ${webhookUrl}`);

  await telegram("setWebhook", {
    url: webhookUrl,
    secret_token: secretToken,
    drop_pending_updates: dropPendingUpdates,
    allowed_updates: ["message"],
  });

  const info = await telegram("getWebhookInfo", {});
  const actualUrl = info.result?.url || null;
  const pending = info.result?.pending_update_count ?? 0;
  const lastError = info.result?.last_error_message || null;

  console.log(`[telegram:webhook] registered: ${actualUrl}`);
  console.log(`[telegram:webhook] pending: ${pending}`);
  if (lastError) console.log(`[telegram:webhook] last error: ${lastError}`);

  if (actualUrl !== webhookUrl) {
    throw new Error(`Webhook mismatch after sync. expected=${webhookUrl} actual=${actualUrl}`);
  }

  console.log("[telegram:webhook] sync complete");
}

main().catch((error) => {
  console.error(`[telegram:webhook] ${error.message}`);
  process.exit(1);
});
