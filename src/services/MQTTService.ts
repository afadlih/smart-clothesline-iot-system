import mqtt, { type MqttClient } from "mqtt";
import { SensorValidator, ValidationError } from "./ValidationService";

export const MQTT_BROKER_URL = "wss://broker.hivemq.com:8884/mqtt";
export const SENSOR_TOPIC = "smart-clothesline/sensor";
export const STATUS_TOPIC = "smart-clothesline/status";
export const COMMAND_TOPIC = "smart-clothesline/command";
export const CONFIG_TOPIC = "smart-clothesline/config";

type SubscribeCallback = (topic: string, payload: string) => void;
type TopicCallback = (payload: string) => void;
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
  rain: boolean;
  status?: "OPEN" | "CLOSED";
  mode?: "AUTO" | "MANUAL";
  timestamp?: number;
};

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

    console.info("[MQTT][RETRY]", {
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

class MqttService {
  private client: MqttClient | null = null;
  private subscribers = new Set<SubscribeCallback>();
  private topicSubscribers = new Map<string, Set<TopicCallback>>();
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

      // Validate using Zod schema
      try {
        const validated = SensorValidator.validate(data);
        return validated as SensorMessage;
      } catch (validationError) {
        if (validationError instanceof ValidationError) {
          SensorValidator.logValidationError(validationError);
        } else {
          console.warn("[MQTT] Validation error:", validationError);
        }
        return null;
      }
    } catch (error) {
      console.warn("[MQTT] Failed to parse sensor message:", error);
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
      callback(raw);
    }
  }

  private connect() {
    if (this.client || typeof window === "undefined") {
      return;
    }

    if (this.retryStrategy.isMaxRetriesExceeded()) {
      console.error("[MQTT] Max retries exceeded, giving up");
      this.setConnection({
        state: "error",
        isOnline: false,
        lastError: "Max reconnection attempts exceeded",
      });
      return;
    }

    this.client = mqtt.connect(MQTT_BROKER_URL, {
      reconnectPeriod: 0, // Disable auto-reconnect, we handle it manually
      connectTimeout: 10000,
      clean: true,
    });
    this.setConnection({ state: "connecting", isOnline: false, lastError: null });

    this.client.on("connect", () => {
      this.retryStrategy.reset();
      this.client?.subscribe([SENSOR_TOPIC, STATUS_TOPIC, CONFIG_TOPIC], (error) => {
        if (error) {
          console.error("[MQTT] Failed to subscribe:", error.message);
        }
      });
      this.setConnection({ state: "online", isOnline: true, lastError: null });
      console.info("[MQTT] Connected successfully");
    });

    this.client.on("reconnect", () => {
      console.info("[MQTT] Reconnecting...");
      this.setConnection({ state: "reconnecting", isOnline: false });
    });

    this.client.on("offline", () => {
      console.warn("[MQTT] Connection offline");
      this.setConnection({ state: "offline", isOnline: false });
      this.scheduleReconnect();
    });

    this.client.on("close", () => {
      console.warn("[MQTT] Connection closed");
      this.setConnection({ state: "offline", isOnline: false });
      this.scheduleReconnect();
    });

    this.client.on("message", (topic, payload) => {
      const raw = payload.toString();
      console.info(`[MQTT][RECV][${topic}]: ${raw}`);

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
      console.error("[MQTT] Connection error:", error.message);
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

    return () => {
      const callbacks = this.topicSubscribers.get(topic);
      if (!callbacks) {
        return;
      }
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.topicSubscribers.delete(topic);
      }
    };
  }

  publish(topic: string, payload: string | Record<string, unknown>) {
    this.connect();
    const message = typeof payload === "string" ? payload : JSON.stringify(payload);
    this.client?.publish(topic, message);
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
