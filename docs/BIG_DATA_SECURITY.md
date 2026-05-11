# Big Data Security Readiness

This document defines security constraints before Hadoop/Spark ingestion.

## Never export secrets

Do not include these in raw or normalized exports:
- MQTT username/password
- Telegram bot token
- Telegram webhook secret
- private server secrets

Public Firebase project metadata may remain in application config, but must not be embedded as secret fields in exported telemetry.

## Raw event schema guidance

Allowed:
- `topic`
- `deviceId`
- `receivedAt`
- `payload`
- `validationStatus`
- `source`

Forbidden:
- connection credentials
- secret tokens
- webhook secrets

## Sanitization before NDJSON/CSV export

Apply sanitization pipeline:
1. Strip credential-like keys (`password`, `token`, `secret`, `auth`).
2. Enforce allow-list fields for export schema.
3. Validate timestamps and numeric bounds.
4. Drop malformed events.

## Data retention guidance

- Keep raw events with finite retention policy.
- Keep normalized analytics data for long-term trends.
- Apply environment separation for retention and export destinations.

## Device ID privacy

- Use stable `deviceId` for operations.
- If needed for shared datasets, apply pseudonymization/hashing per export job.

## Environment separation

- Separate export jobs and storage for local/preview/production.
- Never mix preview/demo telemetry with production analytics lake.
