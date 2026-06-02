import mqtt, { type MqttClient } from "mqtt";
import { SensorValidationLayer, type RawTelemetryPayload } from "./SensorValidationLayer";
import { logger } from "@/lib/logger";
import {
  LEGACY_TOPICS,
  getDeviceCommandTopic as buildDeviceCommandTopic,
  getDeviceConfigAckTopic as buildDeviceConfigAckTopic,
  getDeviceConfigTopic as buildDeviceConfigTopic,
} from "@/services/mqttTopics";

export const MQTT_BROKER_URL = process.env.NEXT_PUBLIC_MQTT_BROKER_URL ?? "wss://broker.hivemq.com:8884/mqtt";
// SECURITY NOTE:
// NEXT_PUBLIC MQTT credentials are visible in browser runtime.
// Never use privileged broker credentials here.
const MQTT_USER = process.env.NEXT_PUBLIC_MQTT_USERNAME;
const MQTT_PASS = process.env.NEXT_PUBLIC_MQTT_PASSWORD;
export const SENSOR_TOPIC = LEGACY_TOPICS.sensor;
export const STATUS_TOPIC = LEGACY_TOPICS.status;
export const COMMAND_TOPIC = LEGACY_TOPICS.command;
export const CONFIG_TOPIC = LEGACY_TOPICS.config;
export const CONFIG_ACK_TOPIC = LEGACY_TOPICS.configAck;
export const PAIRING_DISCOVERY_TOPIC = LEGACY_TOPICS.pairingDiscovery;

if (typeof window !== "undefined" && (MQTT_USER || MQTT_PASS) && process.env.NODE_ENV !== "production") {
  logger.warn("mqtt", "Using browser-exposed MQTT credentials. Ensure broker ACL is low privilege.");
}

type SubscribeCallback = (topic: string, payload: string) => void;
type TopicCallback = (payload: string, topic: string) => void;
type ConnectionState = "connecting" | "online" | "reconnecting" | "offline" | "error";

export type MqttConnectionSnapshot = {
  state: ConnectionState;
  isOnline: boolean;
  topic: string;
  lastError: string | null;
  lastMessageAt: string | null;
};

export type SensorMessage = {
  deviceId?: string;
  temperature: number;
  humidity: number;
  light: number;
  lightRaw?: number;
  lightThreshold?: number;
  rainVal?: number;
  rainRaw?: number;
  rain: boolean;
  status?: "OPEN" | "CLOSED" | "MOVING" | "FAULT" | "UNKNOWN";
  mode?: "AUTO" | "MANUAL";
  timestamp?: number;
};

export type PairingDiscoveryMessage = {
  deviceId: string;
  deviceName: string;
  pairingCode: string;
  status: "pairable" | string;
  ipAddress?: string;
  timestamp?: number;
}

type SensorMessageCallback = (message: SensorMessage) => void;
type ConnectionCallback = (snapshot: MqttConnectionSnapshot) => void;

// ===== RETRY STRATEGY =====
class RetryStrategy {
  private retryCount = 0;
  private readonly maxRetries = 10;
  private readonly baseDelayMs = 5000; // 5 seconds
  private readonly maxDelayMs = 120000; // 2 minutes
  private retryTimeoutId: NodeJS.Timeout | null = null;

  isMaxRetriesExceeded(): boolean {
    return this.retryCount >= this.maxRetries;
  }

  getNextDelay(): number {
    // Exponential backoff: 5s, 10s, 20s, 40s, 80s, 160s, ...
    const exponentialDelay = this.baseDelayMs * Math.pow(2, this.retryCount);
    const cappedDelay = Math.min(exponentialDelay, this.maxDelayMs);
    return cappedDelay;
  }

  incrementRetry(): number {
    return ++this.retryCount;
  }

  reset(): void {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }
    this.retryCount = 0;
  }

  scheduleRetry(callback: () => void): NodeJS.Timeout {
    const delay = this.getNextDelay();
    const timeoutId = setTimeout(callback, delay);
    this.retryTimeoutId = timeoutId;

    logger.warn("mqtt", "Reconnect retry scheduled", {
      attempt: this.retryCount + 1,
      maxRetries: this.maxRetries,
      delayMs: delay,
      delaySeconds: (delay / 1000).toFixed(1),
    });

    return timeoutId;
  }

  cancel(): void {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }
  }
}

export function getDeviceDiscoveryTopic(deviceId: string): string {
  return `smart-clothesline/${deviceId}/pairing/discovery`;
}

export function getDeviceSensorTopic(deviceId: string): string {
  return `smart-clothesline/${deviceId}/sensor`;
}

export function getDeviceStatusTopic(deviceId: string): string {
  return `smart-clothesline/${deviceId}/status`;
}

export function getDeviceCommandTopic(deviceId: string): string {
  return buildDeviceCommandTopic(deviceId);
}

export function getDeviceConfigTopic(deviceId: string): string {
  return buildDeviceConfigTopic(deviceId);
}

export function getDeviceConfigAckTopic(deviceId: string): string {
  return buildDeviceConfigAckTopic(deviceId);
}


class MqttService {
  private client: MqttClient | null = null;
  private subscribers = new Set<SubscribeCallback>();
  private topicSubscribers = new Map<string, Set<TopicCallback>>();
  private dynamicSubscription = new Set<string>();
  private sensorSubscribers = new Set<SensorMessageCallback>();
  private connectionSubscribers = new Set<ConnectionCallback>();
  private connection: MqttConnectionSnapshot = {
    state: "connecting",
    isOnline: false,
    topic: SENSOR_TOPIC,
    lastError: null,
    lastMessageAt: null,
  };
  private retryStrategy = new RetryStrategy();

  private notifyConnection() {
    const snapshot = this.getConnectionSnapshot();
    for (const callback of this.connectionSubscribers) {
      callback(snapshot);
    }
  }

  private setConnection(patch: Partial<MqttConnectionSnapshot>) {
    this.connection = { ...this.connection, ...patch };
    this.notifyConnection();
  }

  private parseSensorMessage(raw: string): SensorMessage | null {
    try {
      const data = this.safeParseJson<Partial<SensorMessage>>(raw);
      if (!data) {
        return null;
      }

      // Validate using SensorValidationLayer
      const validation = SensorValidationLayer.validate(data as RawTelemetryPayload, Date.now());
      if (validation.ok) {
        return {
          deviceId: validation.value.deviceId,
          temperature: validation.value.temperature,
          humidity: validation.value.humidity,
          light: validation.value.light,
          lightRaw: validation.value.lightRaw,
          lightThreshold: validation.value.lightThreshold,
          rainVal: validation.value.rainVal,
          rainRaw: validation.value.rainRaw,
          rain: validation.value.rain,
          status: validation.value.deviceState === "RESTARTING" ? undefined : validation.value.deviceState,
          mode: validation.value.mode,
          timestamp: validation.value.timestamp,
        };
      } else {
        logger.warn("mqtt", "Validation error", validation.reason);
        return null;
      }
    } catch (error) {
      logger.warn("mqtt", "Failed to parse sensor message", error);
      return null;
    }
  }

  private safeParseJson<T>(raw: string): T | null {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  private publishToTopicSubscribers(topic: string, raw: string) {
    const callbacks = this.topicSubscribers.get(topic);
    if (!callbacks) {
      return;
    }

    for (const callback of callbacks) {
      callback(raw, topic);
    }
  }

  private connect() {
    if (this.client || typeof window === "undefined") {
      return;
    }

    if (this.retryStrategy.isMaxRetriesExceeded()) {
      logger.error("mqtt", "Max retries exceeded, giving up");
      this.setConnection({
        state: "error",
        isOnline: false,
        lastError: "Max reconnection attempts exceeded",
      });
      return;
    }

    this.client = mqtt.connect(MQTT_BROKER_URL, {
      ...(MQTT_USER ? { username: MQTT_USER } : {}),
      ...(MQTT_PASS ? { password: MQTT_PASS } : {}),
      reconnectPeriod: 0, // Disable auto-reconnect, we handle it manually
      connectTimeout: 10000,
      clean: true,
    });
    this.setConnection({ state: "connecting", isOnline: false, lastError: null });

    this.client.on("connect", () => {
      this.retryStrategy.reset();
      this.setConnection({ state: "online", isOnline: true, lastError: null });
      logger.info("mqtt", "Connected successfully");

      for (const topic of this.topicSubscribers.keys()) {
        this.client?.subscribe(topic, (error) => {
          if (!error) {
            this.dynamicSubscription.add(topic);
          }
        })
      }
    });

    this.client.on("reconnect", () => {
      logger.warn("mqtt", "Reconnecting...");
      this.setConnection({ state: "reconnecting", isOnline: false });
    });

    this.client.on("offline", () => {
      logger.warn("mqtt", "Connection offline");
      this.setConnection({ state: "offline", isOnline: false });
      this.scheduleReconnect();
    });

    this.client.on("close", () => {
      logger.warn("mqtt", "Connection closed");
      this.setConnection({ state: "offline", isOnline: false });
      this.scheduleReconnect();
    });

    this.client.on("message", (topic, payload) => {
      const raw = payload.toString();
      logger.debug("mqtt", `Message received on ${topic}`, raw);

      for (const callback of this.subscribers) {
        callback(topic, raw);
      }
      this.publishToTopicSubscribers(topic, raw);

      if (topic === SENSOR_TOPIC) {
        const parsed = this.parseSensorMessage(raw);
        if (parsed) {
          for (const callback of this.sensorSubscribers) {
            callback(parsed);
          }
        }
      }

      this.setConnection({
        state: "online",
        isOnline: true,
        lastError: null,
        lastMessageAt: new Date().toISOString(),
      });
    });

    this.client.on("error", (error) => {
      logger.error("mqtt", "Connection error", error.message);
      this.setConnection({ state: "error", isOnline: false, lastError: error.message });
      this.scheduleReconnect();
    });
  }

  private scheduleReconnect() {
    this.retryStrategy.incrementRetry();
    this.retryStrategy.scheduleRetry(() => {
      this.client = null;
      this.connect();
    });
  }

  subscribe(callback: SubscribeCallback): () => void {
    this.connect();
    this.subscribers.add(callback);

    return () => {
      this.subscribers.delete(callback);
    };
  }

  subscribeTopic(topic: string, callback: TopicCallback): () => void {
    this.connect();

    const existing = this.topicSubscribers.get(topic) ?? new Set<TopicCallback>();
    existing.add(callback);
    this.topicSubscribers.set(topic, existing);

    if (this.client?.connected && !this.dynamicSubscription.has(topic)) {
      this.client.subscribe(topic, (error) => {
        if (error) {
          logger.error("mqtt", "Failed to subscribe topic", error.message);
          return;
        }

        this.dynamicSubscription.add(topic);
      })
    }

    return () => {
      const callbacks = this.topicSubscribers.get(topic);
      if (!callbacks) {
        return;
      }
      callbacks.delete(callback);

      if (callbacks.size === 0) {
        this.topicSubscribers.delete(topic);

        if (this.client?.connected && this.dynamicSubscription.has(topic)) {
          this.client.unsubscribe(topic);
          this.dynamicSubscription.delete(topic);
        }
      }
    };
  }

  publish(topic: string, payload: string | Record<string, unknown>): boolean {
    this.connect();
    if (!this.client || !this.client.connected) {
      logger.warn("mqtt", "Publish skipped, client is not connected", { topic });
      return false;
    }
    const message = typeof payload === "string" ? payload : JSON.stringify(payload);
    this.client.publish(topic, message);
    return true;
  }

  onMessage(callback: SensorMessageCallback): () => void {
    this.connect();
    this.sensorSubscribers.add(callback);
    return () => {
      this.sensorSubscribers.delete(callback);
    };
  }

  onConnectionStatus(callback: ConnectionCallback): () => void {
    this.connect();
    this.connectionSubscribers.add(callback);
    callback(this.getConnectionSnapshot());
    return () => {
      this.connectionSubscribers.delete(callback);
    };
  }

  getConnectionSnapshot(): MqttConnectionSnapshot {
    return { ...this.connection };
  }

  isConnected(): boolean {
    return this.client?.connected === true;
  }
}

export const mqttService = new MqttService();
