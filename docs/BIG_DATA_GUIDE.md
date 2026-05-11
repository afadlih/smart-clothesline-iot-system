# Big Data Integration Guide (Pre-Hadoop)

This document outlines the telemetry baseline and security constraints required before integrating with Big Data ecosystems (Hadoop, Spark, etc.).

## 1. Telemetry Baseline

The canonical source of data for Big Data ingestion is the `sensor_data` collection in Firestore.

### Normalized Telemetry Schema
- `deviceId`: Canonical device identifier.
- `temperature`, `humidity`, `light`: Numeric metrics.
- `rain`: Boolean rain state.
- `status`: (`OPEN` | `CLOSED` | `RESTARTING`).
- `receivedAt`: Epoch ms when the backend processed the event.
- `deviceTimestamp`: Uptime or epoch from the device.

## 2. Security & Sanitization

Before exporting data to NDJSON/CSV or streaming to an analytics lake:

- **Secret Stripping:** ALWAYS strip credentials (`password`, `token`, `secret`) from raw payloads.
- **Privacy:** If sharing datasets externally, pseudonymize `deviceId` and `userId` via hashing.
- **Allow-list:** Only export fields defined in the canonical telemetry schema.

## 3. Recommended Analytics Schema

| Field | Type | Description |
|---|---|---|
| `event_id` | String | Unique event UUID |
| `device_id` | String | Canonical ID |
| `topic` | String | MQTT source topic |
| `event_time` | Timestamp | Standardized wall-clock time |
| `metrics` | Struct | Nested numeric data |
| `raw_payload` | JSON | (Optional) Sanitized original payload |

## 4. Readiness Checklist

- [ ] Stable MQTT data contract verified.
- [ ] Firestore telemetry sanitization pipeline active.
- [ ] Daily batch export job configured (NDJSON/CSV).
- [ ] No secrets present in `sensor_data` or `events_log`.

For detailed MQTT security principles, see [MQTT_SECURITY.md](./MQTT_SECURITY.md).
