export const LEGACY_TOPICS = {
  sensor: process.env.NEXT_PUBLIC_MQTT_TOPIC_SENSOR ?? "smart-clothesline/sensor",
  status: process.env.NEXT_PUBLIC_MQTT_TOPIC_STATUS ?? "smart-clothesline/status",
  command: process.env.NEXT_PUBLIC_MQTT_TOPIC_COMMAND ?? "smart-clothesline/command",
  config: "smart-clothesline/config",
  configAck: "smart-clothesline/config/ack",
  pairingDiscovery: "smart-clothesline/pairing/discovery",
} as const;

// Legacy topics are retained for compatibility.
// New firmware should prefer per-device smart-clothesline/{deviceId}/... topics.

export function buildDeviceTopic(deviceId: string, channel: "telemetry" | "status" | "command" | "ack" | "health"): string {
  return `smart-clothesline/${deviceId}/${channel}`;
}

export function getDeviceTelemetryTopics(deviceId: string): string[] {
  return [
    buildDeviceTopic(deviceId, "telemetry"),
    `smart-clothesline/${deviceId}/sensor`,
  ];
}

export function getDeviceStatusTopics(deviceId: string): string[] {
  return [
    buildDeviceTopic(deviceId, "status"),
  ];
}

export function getDeviceCommandTopic(deviceId: string): string {
  return buildDeviceTopic(deviceId, "command");
}

export function getDeviceConfigTopic(deviceId: string): string {
  return `smart-clothesline/${deviceId}/config`;
}

export function getDeviceConfigAckTopic(deviceId: string): string {
  return `smart-clothesline/${deviceId}/config/ack`;
}


