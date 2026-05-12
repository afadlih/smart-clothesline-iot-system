# Hardware & Firmware MQTT Implementation Guide

This document defines the behavior and payload requirements for any firmware (ESP32, Wokwi, or simulator) interacting with the Smart Clothesline system.

## 1. Required Topics

Firmware must handle the following topics:
- `smart-clothesline/sensor` (Publish: Telemetry)
- `smart-clothesline/status` (Publish: State ACK)
- `smart-clothesline/command` (Subscribe: Control)
- `smart-clothesline/config` (Subscribe: Configuration)
- `smart-clothesline/config/ack` (Publish: Config ACK)

## 2. Telemetry Requirements (Periodic)

Every telemetry interval (e.g., 5-30s), publish to `smart-clothesline/sensor`:

```json
{
  "deviceId": "ESP32-01",
  "temperature": 29.4,
  "humidity": 61.2,
  "light": 1234,
  "rain": false,
  "status": "OPEN",
  "mode": "AUTO",
  "lastCommand": "AUTO",
  "timestamp": 1234567,
  "heartbeat": 1234567
}
```

*Note: `timestamp` and `heartbeat` can use `millis()` if epoch time is unavailable.*

## 3. State Requirements (Periodic + Event-driven)

Publish to `smart-clothesline/status` periodically and **immediately after every command execution**:

```json
{
  "deviceId": "ESP32-01",
  "status": "OPEN",
  "mode": "AUTO",
  "lastCommand": "AUTO",
  "source": "DEVICE",
  "timestamp": 1234567
}
```

## 4. Command Callback Behavior

| Command | Action | New State |
|---|---|---|
| `OPEN` | Move actuator to open position | `mode=MANUAL`, `status=OPEN` |
| `CLOSE` | Move actuator to closed position | `mode=MANUAL`, `status=CLOSED` |
| `AUTO` | Enable autonomous logic | `mode=AUTO` |
| `MANUAL` | Disable autonomous logic | `mode=MANUAL` |
| `RESTART` | Reboot device | `status=RESTARTING` |

**Rule:** Every command execution MUST be followed by a publish to the `status` topic to acknowledge the change.

## 5. Implementation Notes

- **Actuators:** Manual commands (`OPEN`/`CLOSE`) must override `AUTO` mode and set the mode to `MANUAL`.
- **Connectivity:** Upon reconnection, always publish the current `status` payload immediately to sync the dashboard.
- **Payloads:** Ensure numeric values are numbers, not strings, to comply with Firestore indexing.

For full data structure details, see [MQTT_DATA_CONTRACT.md](./MQTT_DATA_CONTRACT.md).
