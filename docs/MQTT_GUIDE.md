# MQTT Implementation & Data Contract Guide

This document defines the canonical MQTT topics, payload schemas, hardware behavior, and security model for the Smart Clothesline IoT System.

---

## 1. Canonical Topics

| Topic | Direction | Purpose |
|---|---|---|
| `smart-clothesline/sensor` | Publish (Device) | Periodic telemetry (temp, humidity, light, rain) |
| `smart-clothesline/status` | Publish (Device) | Authoritative state ACK (status, mode) |
| `smart-clothesline/command` | Subscribe (Device) | Incoming control commands (OPEN, CLOSE, etc.) |
| `smart-clothesline/config` | Subscribe (Device) | System configuration updates |
| `smart-clothesline/config/ack` | Publish (Device) | Confirmation of applied configuration |

---

## 2. Payload Schemas

### A. Telemetry (`smart-clothesline/sensor`)
Published every update interval (e.g., 5-30s).

```json
{
  "deviceId": "ESP32-01",
  "temperature": 29.4,
  "humidity": 61.2,
  "light": 3500,
  "rain": false,
  "lightRaw": 1024,
  "rainVal": 4095,
  "rainRaw": 4095,
  "status": "OPEN",
  "mode": "AUTO",
  "timestamp": 1710000000000,
  "heartbeat": 1710000000000
}
```

**Field Definitions:**
- **`light`**: Normalized `0..10000`. Higher means brighter. Default threshold is `3000` (`light < 3000` is Dark).
- **`rain`**: Authoritative boolean state (`true` = raining).
- **`lightRaw`/`rainVal`/`rainRaw`**: Optional debug/ADC fields.
- **`timestamp`/`heartbeat`**: Can use `millis()` or epoch ms. Dashboard treats non-epoch as uptime.

### B. Status ACK (`smart-clothesline/status`)
Published periodically and **immediately** after every command.

```json
{
  "deviceId": "ESP32-01",
  "status": "OPEN",
  "mode": "AUTO",
  "lastCommand": "OPEN",
  "source": "DEVICE",
  "timestamp": 1710000000000
}
```
- **`source`**: Use `DEVICE` for heartbeats, `COMMAND` for acknowledging an incoming command.

---

## 3. Command Callback Behavior

Firmware must respond to commands on `smart-clothesline/command` and acknowledge via the `status` topic.

| Command | Recommended Action | Resulting State |
|---|---|---|
| `OPEN` | Move servo to open position | `mode=MANUAL`, `status=OPEN` |
| `CLOSE` | Move servo to closed position | `mode=MANUAL`, `status=CLOSED` |
| `AUTO` | Enable autonomous logic | `mode=AUTO` |
| `MANUAL` | Disable autonomous logic | `mode=MANUAL` |
| `RESTART` | Reboot the microcontroller | `status=RESTARTING` |

**Rule:** Every manual command (`OPEN`/`CLOSE`) should override `AUTO` mode and switch the device to `MANUAL`.

---

## 4. Hardware & Wokwi Guidelines

- **Connectivity:** Upon reconnection, publish the current `status` immediately to sync the dashboard.
- **Wokwi ADC Map:** Use `map(adc, 4095, 0, 0, 10000)` to normalize light values.
- **Numeric Compliance:** Ensure all telemetry values are numbers, not strings, to support Firestore indexing.

---

## 5. Security Model & ACLs

### Critical Principle
Any value in `NEXT_PUBLIC_*` is visible in the browser. Browser MQTT credentials must be low-privilege.

### Recommended ACLs

#### Dashboard (Browser) - Low Privilege
- **Subscribe:** `sensor`, `status`, `config/ack`, `pairing/discovery`.
- **Publish:** `command`, `config` (if allowed for that user).
- **Forbidden:** Wildcard subscribe (`#`), admin credentials, or reusing device credentials.

#### Device (ESP32/Wokwi)
- **Publish:** `sensor`, `status`, `config/ack`.
- **Subscribe:** `command`, `config`.
- **Forbidden:** Arbitrary topic publishing outside the `smart-clothesline/` namespace.

---

## 6. Big Data & Analytics Roadmap (Future Readiness)

The current release focuses on stable realtime operations and Firestore persistence. For future Hadoop/Spark integration:

### A. Telemetry Baseline
The canonical source for ingestion is the `sensor_data` collection in Firestore.
- **Metrics**: `temperature`, `humidity`, `light`, `rain`.
- **Metadata**: `deviceId`, `receivedAt` (epoch ms), `createdAt` (Firestore timestamp).

### B. Export & Ingestion Strategy
- **Batch Export:** Periodic export from Firestore to NDJSON or CSV, partitioned by day.
- **Sanitization:** Strip secrets (`password`, `token`, etc.) and pseudonymize IDs if sharing datasets externally.

### C. Analytics Schema
- **Structure:** `event_id`, `device_id`, `topic`, `event_time`, `metrics` (struct), `source`.