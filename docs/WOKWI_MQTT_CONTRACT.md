# Wokwi MQTT Contract

This document mirrors the firmware requirements for Wokwi simulation.

For full details, refer to:
- [FIRMWARE_MQTT_CONTRACT.md](./FIRMWARE_MQTT_CONTRACT.md)
- [MQTT_DATA_CONTRACT.md](./MQTT_DATA_CONTRACT.md)

## Required Topics

- `smart-clothesline/sensor`
- `smart-clothesline/status`
- `smart-clothesline/command`
- `smart-clothesline/config`
- `smart-clothesline/config/ack`

## Sensor Payload (interval publish)

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

## Status Payload (interval + command ACK)

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
