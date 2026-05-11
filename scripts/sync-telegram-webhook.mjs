/**
 * scripts/sync-telegram-webhook.mjs
 * 
 * Securely synchronizes the Telegram webhook after deployment.
 * Uses global fetch (Node 20+).
 */

let APP_BASE_URL = process.env.APP_BASE_URL;
const INTERNAL_COMMAND_SECRET = process.env.INTERNAL_COMMAND_SECRET;

if (!APP_BASE_URL) {
  console.error("Error: APP_BASE_URL is not set.");
  process.exit(1);
}

// Validate protocol
if (!APP_BASE_URL.startsWith('http://') && !APP_BASE_URL.startsWith('https://')) {
  console.error("Error: APP_BASE_URL must start with http:// or https://");
  process.exit(1);
}

// Trim trailing slash
APP_BASE_URL = APP_BASE_URL.replace(/\/$/, '');

if (!INTERNAL_COMMAND_SECRET) {
  console.error("Error: INTERNAL_COMMAND_SECRET is not set.");
  process.exit(1);
}

const syncUrl = `${APP_BASE_URL}/api/telegram/webhook-sync`;

console.log(`[SYNC] Triggering webhook sync for: ${APP_BASE_URL}`);
console.log(`[SYNC] Endpoint: ${syncUrl}`);

async function runSync() {
  try {
    const response = await fetch(syncUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-command-secret': INTERNAL_COMMAND_SECRET
      },
      body: JSON.stringify({
        repair: true,
        force: false,
        dropPendingUpdates: true,
        source: 'script'
      })
    });

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error(`[SYNC] Error: Expected JSON response, but got ${contentType || 'text/plain'}`);
      console.error(`[SYNC] Response: ${text.slice(0, 200)}${text.length > 200 ? '...' : ''}`);
      process.exit(1);
    }

    const data = await response.json();

    if (!response.ok) {
      console.error(`[SYNC] Failed with status ${response.status}`);
      // Log only safe fields if they exist, or the whole safe object
      console.error(JSON.stringify({
        webhookStatus: data.webhookStatus,
        webhookUrlMatch: data.webhookUrlMatch,
        nextAction: data.nextAction
      }, null, 2));
      process.exit(1);
    }

    console.log(`[SYNC] Webhook Status: ${data.webhookStatus}`);
    console.log(`[SYNC] Webhook URL Match: ${data.webhookUrlMatch}`);
    if (data.expectedWebhookUrl) {
      console.log(`[SYNC] Expected URL: ${data.expectedWebhookUrl}`);
    }
    console.log(`[SYNC] Registered URL: ${data.actualTelegramWebhookUrl || 'none'}`);
    console.log(`[SYNC] Next Action: ${data.nextAction}`);

    const isSuccess = data.webhookUrlMatch === true && data.webhookStatus === "ok";

    if (isSuccess) {
      console.log("[SYNC] Webhook is perfectly in sync. Success!");
      process.exit(0);
    } else {
      console.error("[SYNC] Webhook mismatch or incomplete status after repair attempt.");
      process.exit(1);
    }
  } catch (error) {
    console.error("[SYNC] Network or Execution error:", error.message);
    process.exit(1);
  }
}

runSync();
