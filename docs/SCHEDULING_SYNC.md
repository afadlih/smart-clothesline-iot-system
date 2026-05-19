# Scheduling Synchronization

This document describes the architectural design for per-device schedule synchronization and execution within the Smart Clothesline IoT System.

## Scope

Schedules are stored per user and per device:

`users/{uid}/devices/{deviceId}/schedules/{scheduleId}`

Client Cache Key: `smart-clothesline-schedules-cache-v1:{uid}:{deviceId}`

## Runtime

Schedule execution targets the active device selected in IoT Hub.

The background browser runtime runs as a background process inside the `useSensor` hook, periodically checking the schedule transition every second.

## MQTT

Schedule commands use the same routing as dashboard commands:

- `smart-clothesline/{deviceId}/command`
- plus legacy Wokwi command topic `smart-clothesline/command` only for the `wokwi-default` device.

Command payload contract:
```json
{
  "deviceId": "<activeDeviceId>",
  "command": "OPEN" | "CLOSE",
  "source": "schedule",
  "reason": "schedule window started/ended",
  "timestamp": 1760000000000
}
```

## Limitation

Current scheduling is dashboard-runtime scheduling. The browser/app must be running for scheduled commands to publish.

Firmware-side scheduling is a future improvement.

## Safety

- Schedule `OPEN` is blocked when rain is detected.
- Schedule command is not sent if MQTT is disconnected, telemetry is stale, or the device is moving/faulted.
- Manual mode precedence: If the device mode is `MANUAL`, automated scheduled operations are bypassed.

## Local Firestore troubleshooting

If local browser console shows `net::ERR_BLOCKED_BY_CLIENT` for Firestore write channel, disable adblock/privacy extensions for localhost and `firestore.googleapis.com`. Do not treat this adblocker network block as an application failure.
