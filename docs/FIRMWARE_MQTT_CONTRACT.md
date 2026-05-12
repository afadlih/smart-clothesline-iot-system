# Firmware MQTT Contract

This project expects firmware to publish both `sensor` and `status` topics.

## Required Sensor Payload (every update interval)

```json
{
  "deviceId": "wokwi-default",
  "temperature": 29.4,
  "humidity": 61.2,
  "light": 3500,
  "lightRaw": 1024,
  "lightThreshold": 3000,
  "rain": false,
  "rainVal": 4095,
  "status": "OPEN",
  "mode": "AUTO",
  "lastCommand": "AUTO",
  "timestamp": 1234567,
  "heartbeat": 1234567
}
```

### Sensor Field Definitions:
- `light`: Normalized value `0..10000`. **Higher means brighter, lower means darker.**
- `lightRaw`: Optional raw ADC value.
- `lightThreshold`: Optional threshold currently used by firmware.
- `rainVal`: Optional raw rain ADC value.
- `rain`: Boolean. `true` if raining, `false` otherwise.
- `status`: Current physical state (`OPEN`, `CLOSED`, `RESTARTING`).
- `mode`: Current logic mode (`AUTO`, `MANUAL`).

`timestamp`/`heartbeat` may use `millis()`; dashboard will treat it as uptime when not epoch.

## Required Status Payload

Publish after every command and periodically every sensor interval:

```json
{
  "deviceId": "wokwi-default",
  "status": "OPEN",
  "mode": "AUTO",
  "lastCommand": "AUTO",
  "source": "DEVICE",
  "timestamp": 1234567
}
```

### Status Field Definitions:
- `source`: Use `DEVICE` for heartbeat, `COMMAND` for acknowledging an incoming MQTT command.

## Command Callback Behavior

- `OPEN`:
  - set `mode = MANUAL`
  - set `status = OPEN`
  - set `lastCommand = OPEN`
  - move servo open
  - publish status ACK (source="COMMAND")

- `CLOSE`:
  - set `mode = MANUAL`
  - set `status = CLOSED`
  - set `lastCommand = CLOSE`
  - move servo closed
  - publish status ACK (source="COMMAND")

- `AUTO`:
  - set `mode = AUTO`
  - set `lastCommand = AUTO`
  - publish status ACK (source="COMMAND")

- `MANUAL`:
  - set `mode = MANUAL`
  - set `lastCommand = MANUAL`
  - publish status ACK (source="COMMAND")
  - no automatic servo movement

- `RESTART`:
  - set `status = RESTARTING`
  - set `lastCommand = RESTART`
  - publish status ACK (source="COMMAND")

## Telegram Integration Architecture
- Telegram hardware commands use server-side direct MQTT publish first.
- The dashboard browser-bridge is a fallback.
- Outbound Telegram notifications can work while inbound commands fail if the webhook is missing.
- Telegram webhook sync is required after `APP_BASE_URL` changes.

