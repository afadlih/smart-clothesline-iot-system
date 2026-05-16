# Big Data & Analytics Roadmap

> [!NOTE]
> **Status: Future Readiness.** The current v1.0.0 release focuses on stable realtime operations and Firestore persistence. This document outlines the roadmap for future Hadoop/Spark integration.

---

## 1. Telemetry Baseline
The canonical source for ingestion is the `sensor_data` collection in Firestore.

### Schema Requirements:
- `deviceId`: Canonical identifier.
- `temperature`, `humidity`, `light`: Numeric metrics.
- `rain`: Boolean state.
- `status`: (`OPEN` | `CLOSED` | `RESTARTING`).
- `receivedAt`: Epoch ms (backend processing time).
- `createdAt`: Firestore server timestamp.

---

## 2. Export & Ingestion Strategy

- **Batch Export:** Periodic export from Firestore to NDJSON or CSV, partitioned by day.
- **Sanitization:** 
  - **Strip Secrets:** Always remove `password`, `token`, `secret`, and `auth` keys.
  - **Pseudonymization:** Hash `deviceId` and `userId` if sharing datasets externally.
  - **Validation:** Drop malformed records before export.

---

## 3. Recommended Analytics Schema (Hadoop/Spark)

| Field | Type | Description |
|---|---|---|
| `event_id` | String | Unique UUID |
| `device_id` | String | Canonical ID |
| `topic` | String | MQTT source topic |
| `event_time` | Timestamp | Standardized wall-clock time |
| `metrics` | Struct | Nested numeric data (temp, humidity, light) |
| `source` | String | `STATUS_TOPIC` or `SENSOR_FALLBACK` |

---

## 4. Security & Compliance
- **Environment Separation:** Separate export jobs for demo/preview and production telemetry.
- **Data Retention:** Finite retention for raw events; long-term storage for normalized aggregates.
- **Privacy:** Enforce allow-list fields for all external data streams.
