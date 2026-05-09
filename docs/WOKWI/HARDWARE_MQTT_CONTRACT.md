# Wokwi Hardware MQTT Contract

This file mirrors the main hardware contract for Wokwi simulation.

Primary reference:
- `docs/HARDWARE_MQTT_CONTRACT.md`
- `docs/FIRMWARE_MQTT_CONTRACT.md`
- `docs/MQTT_DATA_CONTRACT.md`

## Required command behavior

- `OPEN`: set `mode=MANUAL`, `status=OPEN`, `lastCommand=OPEN`, publish status ACK
- `CLOSE`: set `mode=MANUAL`, `status=CLOSED`, `lastCommand=CLOSE`, publish status ACK
- `AUTO`: set `mode=AUTO`, `lastCommand=AUTO`, publish status ACK
- `MANUAL`: set `mode=MANUAL`, `lastCommand=MANUAL`, publish status ACK
- `RESTART`: set `status=RESTARTING`, `lastCommand=RESTART`, publish status ACK

## Required periodic publish

Every telemetry interval:
- publish `smart-clothesline/sensor`
- publish `smart-clothesline/status`

This keeps dashboard mode/status synchronized and prevents stale state after reload.
