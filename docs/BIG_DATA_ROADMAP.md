# Big Data & Analytics Roadmap

This is the canonical Hadoop roadmap for the project. It folds together the previous Hadoop integration notes, checklist, and demo script into one document so the guidance stays in one place.

## 1. Scope
- Hadoop is batch analytics only.
- `src/app/big-data/page.tsx` is sample/demo only and does not require Hadoop at runtime.
- Production export and cluster automation are follow-up tasks, not runtime dependencies.

## 2. Telemetry Baseline
The canonical source for ingestion is the `sensor_data` collection in Firestore.

### Schema Requirements
- `deviceId`: Canonical identifier.
- `temperature`, `humidity`, `light`: Numeric metrics.
- `rain`: Boolean state.
- `status`: `OPEN`, `CLOSED`, or `RESTARTING`.
- `receivedAt`: Epoch ms for backend processing.
- `createdAt`: Firestore server timestamp.

## 3. Export & Ingestion Strategy
- Export Firestore rows as daily CSV or NDJSON files.
- Remove secrets and other sensitive fields before export.
- Drop malformed records before writing cluster input.
- Keep export jobs separate for demo, staging, and production datasets.

## 4. Recommended Analytics Schema
| Field | Type | Description |
|---|---|---|
| `event_id` | String | Unique UUID |
| `device_id` | String | Canonical ID |
| `topic` | String | MQTT source topic |
| `event_time` | Timestamp | Standardized wall-clock time |
| `metrics` | Struct | Nested numeric data (temp, humidity, light) |
| `source` | String | `STATUS_TOPIC` or `SENSOR_FALLBACK` |

## 5. MVP Jobs
- `DailySensorSummaryJob`
- `RainEventAggregationJob`
- `DeviceHealthJob`
- `AlertSummaryJob`

## 6. Manual Hadoop Checklist
1. Prepare NameNode and DataNode services.
2. Verify HDFS write access from the ingestion machine.
3. Copy exported CSV from `exports/` to the NameNode via SCP.
4. Run `hadoop fs -put sensor_YYYY-MM-DD.csv /input/smart-clothesline/`.
5. Run the MapReduce jobs listed above.
6. Validate `part-00000` output files.
7. Convert the output with `scripts/bigdata/convert-mapreduce-output-to-json.mjs`.
8. Publish the JSON into `public/bigdata-reports/`.

## 7. Demo Script
1. Generate export:
   `node scripts/bigdata/export-firestore-sensor-data.mjs`
2. Transfer CSV manually to the Hadoop NameNode:
   `scp exports/sensor_YYYY-MM-DD.csv user@namenode:/tmp/`
3. Put the file into HDFS:
   `hadoop fs -put /tmp/sensor_YYYY-MM-DD.csv /input/smart-clothesline/`
4. Run `DailySensorSummaryJob`.
5. Copy `part-00000` locally and convert:
   `node scripts/bigdata/convert-mapreduce-output-to-json.mjs <path-to-part-00000> public/bigdata-reports/daily-summary.sample.json`
6. Open `/big-data`.

## 8. Security & Compliance
- Keep export jobs separated by environment.
- Prefer finite retention for raw events and longer retention for aggregates.
- Use allow-list fields for any external dataset.

## 9. Related Docs
- [`docs/DESIGN.md`](./DESIGN.md)
- [`docs/HADOOP_CLUSTER_CHECKLIST.md`](./HADOOP_CLUSTER_CHECKLIST.md) if the checklist is referenced in older notes.
- [`docs/HADOOP_DEMO_SCRIPT.md`](./HADOOP_DEMO_SCRIPT.md) if the demo flow is referenced in older notes.
- [`docs/BIG_DATA_HADOOP_INTEGRATION.md`](./BIG_DATA_HADOOP_INTEGRATION.md) if the migration notes are referenced in older notes.
