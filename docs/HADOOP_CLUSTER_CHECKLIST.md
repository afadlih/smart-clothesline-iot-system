# Hadoop Cluster Checklist

1. Prepare NameNode and DataNode services.
2. Verify HDFS write access from the ingestion machine.
3. Copy exported CSV from `exports/` to NameNode via SCP.
4. Run `hadoop fs -put sensor_YYYY-MM-DD.csv /input/smart-clothesline/`.
5. Execute MapReduce jobs:
- DailySensorSummaryJob
- RainEventAggregationJob
- DeviceHealthJob
- AlertSummaryJob
6. Validate `part-00000` output files.
7. Convert output with `scripts/bigdata/convert-mapreduce-output-to-json.mjs`.
8. Publish JSON into `public/bigdata-reports/`.
