# MQTT Security Model

This document defines secure MQTT credential usage for Smart Clothesline.

## Critical principle

Any value in `NEXT_PUBLIC_*` is visible to browser users.
This means browser MQTT username/password are public by design.

- Do not treat browser-side MQTT credentials as secrets.
- Do not rely on frontend encryption to hide broker credentials.
- TLS/WSS protects transport, not client-side secret visibility.

## Option 1: Demo/Preview direct browser MQTT

- Browser connects directly to broker.
- Use low-privilege ACL credentials only.
- Acceptable for demo/staging.
- Rotate often.

## Option 2: Production server-side MQTT bridge (recommended)

- Browser never receives privileged MQTT credentials.
- Server/worker stores:
  - `MQTT_BROKER_URL`
  - `MQTT_USERNAME`
  - `MQTT_PASSWORD`
- Browser communicates with protected API/channel.
- Long-lived MQTT bridge should run in persistent runtime (not serverless subscribe loop).

Recommended runtimes:
- Cloud Run
- Railway
- Render worker
- Fly.io
- VPS

Vercel should remain frontend + API diagnostics layer.

## Option 3: Short-lived MQTT token flow

- Use broker-issued short-lived scoped credentials/tokens if supported.
- Scope by topic/device.
- Expire quickly.

## ACL recommendation

### Browser dashboard credentials (low privilege)

Subscribe allow:
- `smart-clothesline/sensor`
- `smart-clothesline/status`
- `smart-clothesline/config/ack`
- `smart-clothesline/pairing/discovery`

Publish allow only if needed:
- `smart-clothesline/command`
- `smart-clothesline/config`

Never allow:
- wildcard publish/subscribe (`smart-clothesline/#`)
- admin/root broker credentials in browser
- reuse of firmware/device credentials in browser

### Device credentials (ESP32/Wokwi)

Publish allow:
- `smart-clothesline/sensor`
- `smart-clothesline/status`
- `smart-clothesline/config/ack`
- `smart-clothesline/pairing/discovery`

Subscribe allow:
- `smart-clothesline/command`
- `smart-clothesline/config`

Never allow arbitrary topic publishing.
