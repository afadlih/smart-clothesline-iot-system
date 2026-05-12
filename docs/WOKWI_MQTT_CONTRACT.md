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
  "light": 3500,
  "lightRaw": 1024,
  "lightThreshold": 3000,
  "rain": false,
  "rainVal": 4095,
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

## Light Contract
- `light`: Normalized value `0..10000`.
- **Brighter = Higher value**.
- **Darker = Lower value**.
- Threshold (default 3000): `light < 3000` means dark.

