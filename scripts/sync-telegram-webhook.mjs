/**
 * scripts/sync-telegram-webhook.mjs
 * 
 * Securely synchronizes the Telegram webhook after deployment.
 */

import fetch from 'node-fetch';

const APP_BASE_URL = process.env.APP_BASE_URL;
const INTERNAL_COMMAND_SECRET = process.env.INTERNAL_COMMAND_SECRET;

if (!APP_BASE_URL) {
  console.error("Error: APP_BASE_URL is not set.");
  process.exit(1);
}

if (!INTERNAL_COMMAND_SECRET) {
  console.error("Error: INTERNAL_COMMAND_SECRET is not set.");
  process.exit(1);
}

const syncUrl = `${APP_BASE_URL.replace(/\/$/, '')}/api/telegram/webhook-sync`;

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
        dropPendingUpdates: true
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`[SYNC] Failed with status ${response.status}`);
      console.error(JSON.stringify(data, null, 2));
      process.exit(1);
    }

    console.log(`[SYNC] Status: ${data.webhookStatus}`);
    console.log(`[SYNC] Match: ${data.webhookUrlMatch}`);
    console.log(`[SYNC] Actual URL: ${data.actualTelegramWebhookUrl || 'none'}`);
    console.log(`[SYNC] Next Action: ${data.nextAction}`);

    if (data.webhookUrlMatch) {
      console.log("[SYNC] Webhook is in sync. Success!");
      process.exit(0);
    } else {
      console.error("[SYNC] Webhook mismatch detected after repair attempt.");
      process.exit(1);
    }
  } catch (error) {
    console.error("[SYNC] Network error:", error.message);
    process.exit(1);
  }
}

runSync();
