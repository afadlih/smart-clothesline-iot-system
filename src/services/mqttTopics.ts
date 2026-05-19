export const WOKWI_DEFAULT_DEVICE_ID = "wokwi-default";

export const LEGACY_TOPICS = {
  sensor: process.env.NEXT_PUBLIC_MQTT_TOPIC_SENSOR ?? "smart-clothesline/sensor",
  status: process.env.NEXT_PUBLIC_MQTT_TOPIC_STATUS ?? "smart-clothesline/status",
  command: process.env.NEXT_PUBLIC_MQTT_TOPIC_COMMAND ?? "smart-clothesline/command",
  config: "smart-clothesline/config",
  configAck: "smart-clothesline/config/ack",
  pairingDiscovery: "smart-clothesline/pairing/discovery",
} as const;

function uniqueTopics(topics: string[]): string[] {
  return [...new Set(topics.filter(Boolean))];
}

export function buildDeviceTopic(
  deviceId: string,
  channel: "telemetry" | "sensor" | "status" | "command" | "ack" | "health" | "config" | "config/ack" | "pairing/discovery"
): string {
  return `smart-clothesline/${deviceId}/${channel}`;
}

export function getDeviceTelemetryTopics(deviceId: string): string[] {
  return uniqueTopics([
    buildDeviceTopic(deviceId, "telemetry"),
    buildDeviceTopic(deviceId, "sensor"),
    LEGACY_TOPICS.sensor,
  ]);
}

export function getDeviceStatusTopics(deviceId: string): string[] {
  return uniqueTopics([
    buildDeviceTopic(deviceId, "status"),
    LEGACY_TOPICS.status,
  ]);
}

export function getPairingDiscoveryTopics(deviceId: string): string[] {
  return uniqueTopics([
    buildDeviceTopic(deviceId, "pairing/discovery"),
    LEGACY_TOPICS.pairingDiscovery,
  ]);
}

export function getDeviceCommandTopic(deviceId: string): string {
  return buildDeviceTopic(deviceId, "command");
}

export function getCommandPublishTopics(deviceId: string): string[] {
  const topics = [getDeviceCommandTopic(deviceId)];

  if (deviceId === WOKWI_DEFAULT_DEVICE_ID) {
    topics.push(LEGACY_TOPICS.command);
  }

  return uniqueTopics(topics);
}

export function getDeviceConfigTopic(deviceId: string): string {
  return buildDeviceTopic(deviceId, "config");
}

export function getDeviceConfigAckTopic(deviceId: string): string {
  return buildDeviceTopic(deviceId, "config/ack");
}
