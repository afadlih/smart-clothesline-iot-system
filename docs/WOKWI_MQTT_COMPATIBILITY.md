# Wokwi MQTT Compatibility

## Required dashboard env

The browser dashboard uses MQTT over WebSocket:

```env
NEXT_PUBLIC_MQTT_BROKER_URL=wss://<hivemq-cloud-host>:8884/mqtt
NEXT_PUBLIC_MQTT_USERNAME=<username>
NEXT_PUBLIC_MQTT_PASSWORD=<password>
```

Wokwi uses MQTT/TLS:

```
host: <hivemq-cloud-host>
port: 8883
```

Both must point to the same HiveMQ Cloud host and credentials.

## Device ID must match

The dashboard subscribes based on active device ID.

If Wokwi uses:

```cpp
const char* device_id = "wokwi-default";
```

then /iot-hub active device must be:

```
wokwi-default
```

If active device is a Firestore-generated ID like:

```
a92e5ed47d3e8b412a65dca06ab56dfb
```

then Wokwi must use that same `device_id`, or the dashboard will subscribe to different topics.

## Preferred topics

```
smart-clothesline/wokwi-default/sensor
smart-clothesline/wokwi-default/status
smart-clothesline/wokwi-default/command
smart-clothesline/wokwi-default/config
smart-clothesline/wokwi-default/config/ack
smart-clothesline/wokwi-default/pairing/discovery
```

## Troubleshooting & Stale Local Storage Queues

If the queue shows failed old items during development, clear the `localStorage` key for the `sensor_data` queue:

```js
localStorage.removeItem("smart-clothesline-queue-sensor_data");
location.reload();
```

Do not auto-clear user data silently.

## Debug checklist

1. Subscribe to `smart-clothesline/#` in MQTTX/HiveMQ client.
2. Confirm Wokwi publishes sensor/status.
3. Confirm browser console logs active device and subscribed topics.
4. Confirm active device ID matches Wokwi `device_id`.
5. Confirm dashboard receives telemetry.
6. Confirm Firestore `sensor_data` gets new document.
