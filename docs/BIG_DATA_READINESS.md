# Big Data Readiness (Pre-Hadoop)

This document defines the current telemetry baseline before Hadoop/Spark work begins.

## Current source collections

- `sensor_data`
- `events_log`
- `telegram_commands`
- `telegram_audit`
- `system_settings/telegram_bridge`

## Current MQTT topics

- `smart-clothesline/sensor`
- `smart-clothesline/status`
- `smart-clothesline/command`
- `smart-clothesline/config`
- `smart-clothesline/config/ack`

## Firestore telemetry schema in `sensor_data`

- `deviceId` (optional string)
- `temperature` (number)
- `humidity` (number)
- `light` (number)
- `rain` (boolean)
- `status` (`OPEN` | `CLOSED` | `RESTARTING`)
- `mode` (`AUTO` | `MANUAL`, optional)
- `source` (`STATUS_TOPIC` | `SENSOR_FALLBACK` | `UNKNOWN`, optional)
- `receivedAt` (optional number, epoch ms)
- `deviceTimestamp` (optional number, epoch ms)
- `deviceUptimeMs` (optional number, uptime millis)
- `createdAt` (server timestamp)

## Raw vs normalized recommendation

- Keep `sensor_data` as normalized operational telemetry for dashboards and analytics.
- Add future collection `raw_mqtt_events` for unmodified payload archival.
- Use normalized fields for aggregations and SLAs.
- Keep raw payload for replay/debug and schema migration safety.

## Export strategy (before Hadoop)

- Batch export from `sensor_data` to NDJSON or CSV (time-partitioned by day/hour).
- Include `createdAt` and `receivedAt` in export records.
- Preserve `deviceId` and `source` for partitioning and quality checks.
- Validate and drop malformed records before export.

## Recommended Hadoop event schema

- `event_id`
- `device_id`
- `topic`
- `event_time`
- `received_at`
- `temperature`
- `humidity`
- `light`
- `rain`
- `status`
- `mode`
- `source`
- `raw_payload`

## Prerequisites before Hadoop implementation

- Stable MQTT contract across firmware and dashboard consumers.
- Deployed and verified Firestore rules and indexes.
- Working telemetry export job (`sensor_data` -> NDJSON/CSV).
- Consistent `deviceId` usage across all producers.
- No secrets committed in repository or exported datasets.
