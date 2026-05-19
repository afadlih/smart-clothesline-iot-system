# Big Data Hadoop Integration

Hadoop in this project is batch analytics only.

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

Implementation notes:
- Dashboard remains the control surface for device commands.
- Telegram is notification-only.
- `/big-data` uses sample JSON and does not require Hadoop at runtime.
- Use `scripts/bigdata/export-firestore-sensor-data.mjs` for scaffold export.
- Use `scripts/bigdata/convert-mapreduce-output-to-json.mjs` to convert MapReduce output.

Recommended MVP jobs:
- DailySensorSummaryJob
- RainEventAggregationJob
- DeviceHealthJob
- AlertSummaryJob
