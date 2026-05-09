# Wokwi MQTT Contract

This project expects firmware to publish both `sensor` and `status` topics.

## Required Sensor Payload (every update interval)

```json
{
  "deviceId": "wokwi-default",
  "temperature": 29.4,
  "humidity": 61.2,
  "light": 1234,
  "rain": false,
  "status": "OPEN",
  "mode": "AUTO",
  "lastCommand": "AUTO",
  "timestamp": 1234567,
  "heartbeat": 1234567
}
```

`timestamp`/`heartbeat` may use `millis()`; dashboard will treat it as uptime when not epoch.

## Required Status Payload

Publish after every command and periodically every sensor interval:

```json
{
  "deviceId": "wokwi-default",
  "status": "OPEN",
  "mode": "AUTO",
  "lastCommand": "AUTO",
  "source": "DEVICE",
  "timestamp": 1234567
}
```

## Command Callback Behavior

- `OPEN`:
  - set `mode = MANUAL`
  - set `status = OPEN`
  - set `lastCommand = OPEN`
  - move servo open
  - publish status ACK

- `CLOSE`:
  - set `mode = MANUAL`
  - set `status = CLOSED`
  - set `lastCommand = CLOSE`
  - move servo closed
  - publish status ACK

- `AUTO`:
  - set `mode = AUTO`
  - set `lastCommand = AUTO`
  - publish status ACK

- `MANUAL`:
  - set `mode = MANUAL`
  - set `lastCommand = MANUAL`
  - publish status ACK
  - no automatic servo movement

- `RESTART`:
  - set `status = RESTARTING`
  - set `lastCommand = RESTART`
  - publish status ACK
