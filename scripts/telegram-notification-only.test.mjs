// Uses global fetch (Node 18+)

const BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';
const TEST_CHAT_ID = '12345678'; // Mock chat ID

async function runTests() {
  console.log('🚀 Starting Telegram Notification-Only Validation...\n');

  // 1. Test Diagnostics
  console.log('--- [1] Checking Diagnostics ---');
  try {
    const res = await fetch(`${BASE_URL}/api/telegram/diagnostics`);
    const data = await res.json();
    if (data.ok && data.telegramMode === 'notification-only') {
      console.log('✅ Diagnostics reporting notification-only mode.');
    } else {
      console.error('❌ Diagnostics failed or reporting wrong mode:', data);
    }
  } catch (err) {
    console.error('❌ Diagnostics request failed:', err.message);
  }

  // 2. Test Webhook Command Rejection
  console.log('\n--- [2] Checking Webhook Command Rejection ---');
  try {
    const res = await fetch(`${BASE_URL}/api/telegram/webhook`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-telegram-bot-api-secret-token': process.env.TELEGRAM_WEBHOOK_SECRET || ''
      },
      body: JSON.stringify({
        update_id: 100,
        message: {
          text: '/open',
          chat: { id: parseInt(TEST_CHAT_ID), type: 'private' },
          from: { id: 111, username: 'tester' },
          date: Math.floor(Date.now() / 1000)
        }
      })
    });
    const data = await res.json();
    if (data.ok && data.info?.includes('notification-only')) {
      console.log('✅ Webhook correctly replied with notification-only status.');
    } else {
      console.error('❌ Webhook failed to reply correctly:', data);
    }
  } catch (err) {
    console.error('❌ Webhook request failed:', err.message);
  }

  // 3. Test Deprecated Route (command-result)
  console.log('\n--- [3] Checking Deprecated Routes (410 Gone) ---');
  try {
    const res = await fetch(`${BASE_URL}/api/telegram/command-result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commandId: '123', status: 'done' })
    });
    if (res.status === 410) {
      console.log('✅ /api/telegram/command-result correctly returns 410.');
    } else {
      console.error('❌ /api/telegram/command-result returned status:', res.status);
    }
  } catch (err) {
    console.error('❌ Command-result request failed:', err.message);
  }

  console.log('\n✨ Validation Finished.');
}

runTests();
