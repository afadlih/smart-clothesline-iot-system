# Schedule Synchronization Architecture

This document describes the architectural design for per-device schedule synchronization and execution within the Smart Clothesline IoT System.

## 1. Context & Architecture

Historically, schedules were stored globally and execution depended on the Schedule page being actively open in the browser. In the current production architecture, scheduling is fully decentralized, per-device scoped, and driven by a background browser runtime.

```txt
+-------------------------------------------------------------+
|                     Browser Runtime                        |
|                                                             |
|   +------------------+         +-------------------------+  |
|   |  Schedule page   |         |    useSensor hook       |  |
|   | (Record manager  |         |   (Background timer)    |  |
|   |   only; no execution)      +------------+------------+  |
|   +--------+---------+                      |               |
|            |                                | check every 1s|
|            | CRUD operations                v               |
|            |                     +----------+----------+    |
|            |                     |   Evaluate Schedule |    |
|            |                     |      Transition     |    |
|            |                     +----------+----------+    |
|            |                                |               |
+------------v--------------------------------v---------------+
             |                                |
             | CRUD                           | Publish command if transitioned
             v                                v
+------------+--------------------+  +--------+---------------+
| Firestore Scoped Storage        |  | MQTT Broker            |
| users/{uid}/devices/{devId}/    |  | Topics:                |
|   schedules/{schId}             |  | smart-clothesline/     |
+---------------------------------+  |   {deviceId}/command   |
                                     +------------------------+
```

---

## 2. Per-Device Scoping

Schedules are owned by specific users and associated with discrete active devices.

- **Firestore Storage Path:** `users/{uid}/devices/{deviceId}/schedules/{scheduleId}`
- **Fallback Support:** If a user profile or active device ID is not loaded/found, the system safely falls back to reading/writing from the global schedules collection and scoped client localStorage caches.
- **Client Cache Key:** `smart-clothesline-schedules-cache-v1:{uid}:{deviceId}`

---

## 3. Transition Evaluation Model

Rather than executing time checks on every state change, schedule transitions are evaluated using a pure, deterministic engine:

### Evaluator Logic (`evaluateScheduleTransition`)

```typescript
export function evaluateScheduleTransition(input: {
  now: number;
  currentStatus: "OPEN" | "CLOSED" | "MOVING" | "FAULT" | "RESTARTING" | "UNKNOWN" | null;
  mode: "AUTO" | "MANUAL" | null;
  schedules: StoredScheduleItem[];
  sensorRain: boolean;
  isDark: boolean;
  lastPublishedScheduleState: "ACTIVE" | "INACTIVE" | null;
}): ScheduleRuntimeDecision
```

### Safety & Guard Rules

1. **Active Device Check:** Commands are only evaluated if a device is currently selected and active.
2. **Connectivity Check:** If the MQTT client is disconnected or telemetry is not streaming, evaluation is skipped to prevent queue buildup.
3. **Manual Mode Precedence:** If the target device's mode is explicitly `MANUAL`, schedule-driven automated controls are blocked.
4. **Firmware State Guard:** If the device is in a transition state (`MOVING`, `FAULT`, or `RESTARTING`), the schedule engine blocks command publishing.
5. **Safety Fallbacks:** If a schedule transitions to active but a rain event or darkness threshold violation is detected, a safety `CLOSE` command is sent instead of `OPEN`.

---

## 4. Transition Deduplication

To prevent flooding the MQTT broker with commands every second, the system tracks the last published schedule state (`ACTIVE` or `INACTIVE`):

- Commands are **only** published when a transition occurs (`INACTIVE` -> `ACTIVE` or `ACTIVE` -> `INACTIVE`).
- The running state of the active schedule is tracked in-memory (`lastPublishedScheduleState`).
- Repeated evaluations within the same active window result in a deduplicated no-op.

---

## 5. Command Payload Contract

All schedule-driven commands published to MQTT include explicit target scoping. Payloads MUST include the `deviceId` field so the target device can validate and execute the instruction:

```json
{
  "deviceId": "wokwi-default",
  "command": "OPEN",
  "source": "schedule",
  "reason": "Schedule active. Command OPEN sent.",
  "timestamp": 1760000000000
}
```

---

## 6. Diagnostic Logging & Visibility

Every schedule decision is recorded in:
- **Serial Logs:** Visible in the dashboard console under the `COMMAND` category.
- **System Events:** Stored in local state, pushing a visual notification to the system event timeline.
- **Debug Snapshot:** Exposed in the `useSensor` debug state under `scheduleRuntime` showing the loaded source, last issued command, timestamp, and human-readable operator reasons.
