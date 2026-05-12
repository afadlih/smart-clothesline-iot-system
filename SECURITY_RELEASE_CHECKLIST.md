# Security Release Checklist

Run this checklist before release promotion.

## Credential rotation

- Rotate HiveMQ/MQTT password if ever committed.
- Revoke old MQTT credentials.
- Rotate Telegram bot token if exposure suspected.

## Broker access control

- Verify broker ACL for browser credentials is low privilege (subscribe-only or specific limited publish).
- Verify server-side credentials have appropriate publish access to the command topic.
- Verify device credentials are separate from browser credentials.
- Verify no wildcard ACL (`smart-clothesline/#`) for browser identities.

## Repository hygiene

- Verify no secrets in git-tracked files.
- Verify `.env`, `.env.local`, and private secret files are ignored.
- Verify Wokwi firmware examples use placeholders only.

## Platform configuration

- Verify Vercel env values are set per environment (Preview/Production).
- Verify preview does not reuse production MQTT credentials.
- Verify production webhook uses stable APP_BASE_URL.

## Logging and diagnostics

- Verify Telegram token is never printed in logs.
- Verify MQTT credentials (both browser and server-side) are never printed in logs.
- Verify diagnostics endpoints never expose secrets.
- Verify INTERNAL_COMMAND_SECRET is strong and rotated if exposed.
