# Hardware MQTT Contract (Wokwi / ESP32)

This file provides a hardware-focused checklist for firmware behavior.

## Command Handling

- `OPEN`
  - set `mode = MANUAL`
  - set `status = OPEN`
  - set `lastCommand = OPEN`
  - move actuator to open position
  - publish status ACK

- `CLOSE`
  - set `mode = MANUAL`
  - set `status = CLOSED`
  - set `lastCommand = CLOSE`
  - move actuator to closed position
  - publish status ACK

- `AUTO`
  - set `mode = AUTO`
  - set `lastCommand = AUTO`
  - publish status ACK

- `MANUAL`
  - set `mode = MANUAL`
  - set `lastCommand = MANUAL`
  - publish status ACK
  - no autonomous servo movement

- `RESTART`
  - set `status = RESTARTING`
  - set `lastCommand = RESTART`
  - publish status ACK

## Periodic Publish Requirements

Every telemetry interval:
- publish `smart-clothesline/sensor`
- publish `smart-clothesline/status`

This prevents stale mode/status in dashboard after reconnect/reload.
