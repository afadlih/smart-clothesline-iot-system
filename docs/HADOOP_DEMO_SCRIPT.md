# Hadoop Demo Script

Demo flow:

1. Generate export:
`node scripts/bigdata/export-firestore-sensor-data.mjs`

2. Transfer CSV manually to Hadoop NameNode:
`scp exports/sensor_YYYY-MM-DD.csv user@namenode:/tmp/`

3. Put file into HDFS:
`hadoop fs -put /tmp/sensor_YYYY-MM-DD.csv /input/smart-clothesline/`

4. Run MapReduce DailySensorSummaryJob.

5. Copy `part-00000` locally and convert:
`node scripts/bigdata/convert-mapreduce-output-to-json.mjs <path-to-part-00000> public/bigdata-reports/daily-summary.sample.json`

6. Open dashboard page:
`/big-data`

This flow is optional and does not block dashboard runtime.
