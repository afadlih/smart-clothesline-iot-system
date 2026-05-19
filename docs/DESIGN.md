# Smart Clothesline IoT System - System Design

## 1. Purpose
This document defines a practical system design for the Smart Clothesline IoT System used by the current codebase.

The design focuses on:
- Realtime control using MQTT and dashboard actions.
- Notification delivery through Telegram.
- Persistent history and configuration in Firestore.
- Historical batch analytics with Hadoop.
- Safety fallback behavior in ESP32 firmware.

This is an engineering reference for implementation alignment, testing, and maintenance.

## 2. System Boundaries
In scope:
- ESP32 firmware, sensors, actuator control, and local safety fallback.
- MQTT messaging for telemetry, status, and device commands.
- Next.js dashboard as the primary application control surface.
- Firestore for history, event logs, alerts, and configuration.
- Telegram as notification-only channel.
- Hadoop pipeline for batch analytics from exported Firestore data.

Out of scope:
- Replacing broker technology.
- Realtime motor-control loops in cloud services.
- Command execution through Telegram chat.

## 3. High-Level Architecture
The system combines ESP32 safety fallback, MQTT realtime messaging, dashboard control, Telegram notification, Firestore persistence, and Hadoop batch analytics.

```txt
+-------------------+
| ESP32 + Sensors   |
| rain, light, temp |
| humidity, motor   |
+---------+---------+
          |
          | MQTT telemetry/status
          v
+-------------------+        +----------------------+
| MQTT Broker       | <----> | Next.js Dashboard    |
| telemetry/command |        | realtime UI + control|
+---------+---------+        +----------+-----------+
          |                             |
          | sampled/history events      | notification trigger
          v                             v
+-------------------+        +----------------------+
| Firestore         |        | Telegram Notification|
| history, config   |        | notification-only    |
| events, alerts    |        +----------------------+
+---------+---------+
          |
          | daily/batch export
          v
+-------------------+
| Hadoop / HDFS     |
| raw + processed   |
| batch analytics   |
+-------------------+
```

## 4. Design Principles
- Keep control paths explicit and observable.
- Prefer compatibility over forced rewrites.
- Separate realtime control from historical analytics workloads.
- Keep device safety logic resilient to cloud/network outages.
- Use measurable language: latency and reliability targets must be validated in testing, not assumed.

## 5. Data Flow
1. ESP32 publishes telemetry and status to MQTT topics by `deviceId`.
2. Dashboard subscribes to device updates and renders realtime status.
3. Dashboard issues user actions (`OPEN`, `CLOSE`, `AUTO`, `MANUAL`, `RESTART`) through MQTT command topics.
4. Device executes command and publishes acknowledgment/status.
5. Backend services sample telemetry and write history/events/alerts/config to Firestore.
6. Notification service sends Telegram alerts based on events and monitoring rules.
7. Firestore sensor data is exported daily for Hadoop batch jobs.
8. Batch outputs are transformed to JSON for dashboard `/big-data` views.

## 6. MQTT Topic Contract
Recommended per-device MQTT topic contract:

```txt
smart-clothesline/{deviceId}/telemetry
smart-clothesline/{deviceId}/status
smart-clothesline/{deviceId}/command
smart-clothesline/{deviceId}/ack
smart-clothesline/{deviceId}/health
```

Notes:
- These topic names are recommended contracts for alignment.
- If current backend/firmware uses different topics, treat this as target alignment with a staged compatibility plan.
- Do not force immediate breaking topic changes without migration.

## 7. Telemetry Schema
Minimal telemetry payload contract:

```json
{
  "deviceId": "ESP32-01",
  "timestamp": 1760000000000,
  "temperature": 30.7,
  "humidity": 73.0,
  "light": 6100,
  "rain": true,
  "status": "OPEN",
  "mode": "AUTO",
  "source": "mqtt"
}
```

Schema guidance:
- `timestamp` should be epoch milliseconds.
- `status` and `mode` should follow documented state/command enums.
- Additional fields are allowed if backward compatible.

## 8. Operational State Model
Reference operational states:

```txt
SAFE_EXTENDED
RETRACTED
MOVING
RAIN_RETRACTING
OFFLINE
STALE
FAULT
UNKNOWN
```

State handling notes:
- `OFFLINE` and `STALE` are monitoring states and should trigger notifications.
- `RAIN_RETRACTING` indicates local or remote rain-triggered safety action.

## 9. Automation Rules
Core rule for local safety fallback in firmware:

```txt
IF rain_detected = true
THEN retract clothesline locally
```

Rationale:
- Dashboard, internet, MQTT broker, Firebase services, or user devices can fail.
- Safety behavior must remain available at device level.

Automation layering:
- Firmware handles immediate safety fallback.
- Dashboard and backend handle normal operational policy and visibility.

## 10. Error Handling
- MQTT disconnect: device retries with backoff and publishes health when reconnected.
- Command timeout: dashboard marks pending command as failed after timeout window.
- Firestore write failure: queue retry in backend and log `config_sync_failed`/related events.
- Device offline: detect from heartbeat and publish alert event.
- Telemetry stale: trigger stale alert when data freshness threshold is exceeded.

## 11. Storage Strategy
Firestore is used for:
- Sampled sensor history.
- Event logs.
- Alerts.
- Config/preferences.
- Analytics export source.

Firestore is not the realtime motor control loop.

Suggested storage pattern:
- `sensor_data` for sampled telemetry records.
- `events` for discrete system/device events.
- `alerts` for operational notifications and stateful alert tracking.
- `device_config` (or equivalent existing collection) for preferences and thresholds.

## 12. Telegram Notification Design
Telegram role: notification-only.

Supported behavior:
- Send operational alerts and system summaries to users/operators.
- Provide visibility for rain events, offline devices, stale telemetry, and batch status.

Not supported:
- Telegram does not accept hardware control commands.
- Telegram does not publish MQTT commands.
- Telegram does not write command queue documents.
- Telegram does not act as a dashboard bridge fallback.

Historical/removed behavior references (forbidden in active design):
- `/open`, `/close`, `/mode_auto`, `/mode_manual`, `/restart`, `/override`, `/debug`.
- Telegram command router.
- Telegram command executor.
- Telegram command queue.

Notification event types:

```txt
rain_detected
device_offline
telemetry_stale
dry_candidate
config_sync_failed
system_health
hadoop_batch_report
custom
```

## 13. Big Data / Hadoop Design
Hadoop is used for historical batch analytics, not realtime control.

Pipeline:

```txt
Firestore sensor_data
-> export sensor_YYYY-MM-DD.csv
-> SCP to Hadoop NameNode
-> hadoop fs -put to HDFS
-> MapReduce DailySensorSummaryJob
-> output part-00000 in HDFS
-> convert output to JSON
-> dashboard /big-data
```

Recommended Hadoop MVP jobs:

```txt
DailySensorSummaryJob
RainEventAggregationJob
DeviceHealthJob
AlertSummaryJob
```

Implementation sequence:
- Implement Hadoop MapReduce jobs first.
- Spark can be considered after MapReduce MVP is stable.
- This sequence follows course direction that is Hadoop-focused.

## 14. Frontend Structure
Dashboard is the only application-level control surface.

Required control actions:

```txt
OPEN
CLOSE
AUTO
MANUAL
RESTART
```

Frontend responsibilities:
- Realtime status display from MQTT-backed backend stream.
- Command issuance through backend/MQTT integration.
- Alert display from Firestore/notification records.
- Historical and `/big-data` analytics visualization.

## 15. Backend Compatibility Notes
This design document is descriptive, not a forced migration.

Do not rename existing files only to match this document unless there is a separate implementation task and migration plan.

Documentation updates must not imply immediate backend-breaking changes.

Compatibility cautions:
- Do not delete existing dashboard control code only because wording changed here.
- Do not rename service files without migration planning.
- Do not change Firestore collection names without migration.
- Do not change MQTT topics without compatibility plan.
- Do not change firmware payload shape without backward compatibility handling.
- Do not move backend logic only because this design document describes a target pattern.

## 16. Testing Strategy
- Contract tests for MQTT message shape and topic routing.
- Device integration tests for command execution and ack flow.
- Firmware safety tests for rain-triggered retract behavior.
- Firestore persistence tests for sampling/event/alert/config writes.
- Notification tests for Telegram event mapping and delivery failures.
- Batch pipeline tests for export, HDFS ingestion, and MapReduce outputs.

## 17. Documentation Required
- MQTT topic and payload contract reference.
- Dashboard operational playbook (control flow and failure behavior).
- Notification event catalog for Telegram.
- Firestore collection/schema notes with compatibility guidance.
- Hadoop batch runbook and output format notes.
- [Schedule Synchronization Architecture](SCHEDULING_SYNC.md).

## 18. Definition of Done
Design documentation is considered complete when:
- Control flow is clearly dashboard + MQTT based.
- Telegram is notification-only with unsupported command behavior explicitly documented.
- ESP32 local rain safety fallback is documented.
- Firestore role is persistence/config/history, not realtime motor loop.
- Hadoop role is batch analytics only with concrete pipeline and jobs.
- Compatibility warnings prevent accidental backend-breaking interpretation.

## 19. Engineering Notes
- MQTT is selected because it is lightweight and suitable for realtime IoT messaging; actual latency must be measured during testing.
- Reliability and performance claims should be backed by observed metrics in staging/production.
- Any future architecture migration should be tracked as a separate implementation plan with rollback and compatibility strategy.

## 20. Schedule Synchronization Design
Schedules are stored per-device under `users/{uid}/devices/{deviceId}/schedules` and evaluated in the background via the browser runtime. This ensures that scheduled operations execute seamlessly without requiring the dashboard pages to remain open.
For full details, see the [Schedule Synchronization Architecture](SCHEDULING_SYNC.md).

