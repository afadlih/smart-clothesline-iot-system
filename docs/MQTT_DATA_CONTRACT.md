# MQTT Data Contract

## Canonical Topics

### 1) `smart-clothesline/sensor`

Required payload:

```json
{
  "deviceId": "ESP32-01",
  "temperature": 29.4,
  "humidity": 61.2,
  "light": 1234,
  "rain": false,
  "lightRaw": 3500,
  "rainVal": 800,
  "rainRaw": 800,
  "timestamp": 1710000000000,
  "heartbeat": 1710000000000
}
```

### Telemetry Normalization

- **`light`**: 0 to 10000.
  - `0`: Total darkness.
  - `10000`: Maximum brightness.
  - `light < 3000`: System considers it "Dark".
  - Formula (Wokwi/ADC): `map(adc, 4095, 0, 0, 10000)`
- **`rain`**: Boolean.
  - `true`: Raining (authorized state).
  - `false`: No rain.
- **`lightRaw`, `rainVal`, `rainRaw`**: Optional debug fields.
  - `lightRaw`: Raw ADC value for light.
  - `rainVal`: Raw ADC value for rain.
  - `rainRaw`: Unprocessed ADC value for rain.

Optional fallback fields:

```json
{
  "status": "OPEN",
  "mode": "AUTO",
  "lastCommand": "OPEN"
}
```

Rule:
- `smart-clothesline/status` is authoritative for actual device status/mode.
- `sensor` status/mode is fallback only when `status` topic has no fresh value.

### 2) `smart-clothesline/status`

Required payload:

```json
{
  "deviceId": "ESP32-01",
  "status": "OPEN",
  "mode": "AUTO",
  "lastCommand": "OPEN",
  "source": "DEVICE",
  "timestamp": 1710000000000
}
```

Rule:
- Primary source for actual status/mode.
- Command ACK is considered synced only after this payload confirms it.

### 3) `smart-clothesline/command`

```json
{
  "command": "OPEN",
  "deviceId": "optional"
}
```

Supported commands: `OPEN`, `CLOSE`, `AUTO`, `MANUAL`, `RESTART`.

### 4) `smart-clothesline/config`

```json
{
  "deviceId": "optional",
  "rainThreshold": 3000,
  "lightThreshold": 3000,
  "updateIntervalSec": 5,
  "autoCloseOnRain": true,
  "autoCloseOnDark": true,
  "autoOpenWhenSafe": false
}
```

### 5) `smart-clothesline/config/ack`

```json
{
  "type": "CONFIG_ACK",
  "deviceId": "ESP32-01",
  "rainThreshold": 3000,
  "lightThreshold": 3000,
  "updateIntervalSec": 5,
  "autoCloseOnRain": true,
  "autoCloseOnDark": true,
  "autoOpenWhenSafe": false,
  "timestamp": 1710000000000
}
```

## Timestamp Rules

- Dashboard canonical time uses message `receivedAt`.
- Device payload `timestamp` can be epoch ms, epoch sec, or device uptime `millis()`.
- Uptime values are stored as `deviceUptimeMs`, not rendered as wall-clock datetime.

## State Source Rules

- `STATUS_TOPIC`: authoritative device state source.
- `SENSOR_FALLBACK`: used only when status topic is stale/missing.
- `UNKNOWN`: initial/default state before telemetry confidence is established.
